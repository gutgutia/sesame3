/**
 * Invitation Accept API
 *
 * POST /api/invite/[token]/accept - Accept an invitation
 *
 * If user is authenticated:
 *   - Creates AccessGrant
 *   - Marks invitation as accepted
 *   - Returns redirect URL
 *
 * If user is not authenticated:
 *   - Stores token in cookie
 *   - Returns requiresAuth: true
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const INVITATION_TOKEN_COOKIE = "sesame_invitation_token";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Validate invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        inviteeEmail: true,
        inviterUserId: true,
        studentProfileId: true,
        studentProfile: {
          select: { firstName: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invitation" }, { status: 404 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { error: `Invitation is ${invitation.status}` },
        { status: 400 }
      );
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
    }

    // Check if user is authenticated
    const user = await getCurrentUser();

    if (!user) {
      // Not authenticated - store token in cookie and redirect to auth
      const cookieStore = await cookies();
      cookieStore.set(INVITATION_TOKEN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60, // 1 hour
        path: "/",
      });

      return NextResponse.json({
        requiresAuth: true,
        redirectTo: `/auth?redirect=/invite/${token}/complete`,
      });
    }

    // User is authenticated - create access grant
    // First check if grant already exists
    const existingGrant = await prisma.accessGrant.findFirst({
      where: {
        studentProfileId: invitation.studentProfileId,
        grantedToUserId: user.id,
        revokedAt: null,
      },
    });

    if (!existingGrant) {
      await prisma.accessGrant.create({
        data: {
          studentProfileId: invitation.studentProfileId,
          grantedByUserId: invitation.inviterUserId,
          grantedToUserId: user.id,
          permission: "view",
          scope: "full",
        },
      });
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
      },
    });

    // Clear the cookie if it exists
    const cookieStore = await cookies();
    cookieStore.delete(INVITATION_TOKEN_COOKIE);

    return NextResponse.json({
      success: true,
      redirectTo: "/",
    });
  } catch (error) {
    console.error("[Invite] Accept error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
