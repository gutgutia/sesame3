/**
 * Invitation Validation API
 *
 * GET /api/invite/[token] - Validate an invitation and return details
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        inviteeEmail: true,
        inviter: {
          select: { name: true, email: true },
        },
        studentProfile: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "invalid" }, { status: 404 });
    }

    if (invitation.status === "accepted") {
      return NextResponse.json({ error: "already_accepted" }, { status: 400 });
    }

    if (invitation.status === "revoked") {
      return NextResponse.json({ error: "invalid" }, { status: 400 });
    }

    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "expired" },
      });
      return NextResponse.json({ error: "expired" }, { status: 400 });
    }

    const studentName = [
      invitation.studentProfile.firstName,
      invitation.studentProfile.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "the student";

    const inviterName = invitation.inviter.name || invitation.inviter.email;

    return NextResponse.json({
      studentName,
      inviterName,
      inviteeEmail: invitation.inviteeEmail,
    });
  } catch (error) {
    console.error("[Invite] Validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
