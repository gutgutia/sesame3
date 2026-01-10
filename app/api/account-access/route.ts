/**
 * Account Access API
 *
 * Manages shared access to a student's profile.
 * - GET: List all people with access (invitations + grants)
 * - POST: Invite a new email
 * - DELETE: Revoke access
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { InvitationEmail } from "@/lib/email/templates/InvitationEmail";
import { randomBytes } from "crypto";

/**
 * Generate a secure random token for invitations
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Get invitation expiry (7 days from now)
 */
function getInvitationExpiry(): Date {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

/**
 * GET /api/account-access
 * List all people with access to this profile
 */
export async function GET() {
  try {
    const user = await requireAuth();
    const profileId = await requireProfile();

    // Get the profile to check ownership
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: { userId: true, firstName: true, lastName: true },
    });

    if (!profile || profile.userId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Get active access grants
    const accessGrants = await prisma.accessGrant.findMany({
      where: {
        studentProfileId: profileId,
        revokedAt: null,
      },
      select: {
        id: true,
        grantedTo: {
          select: { email: true, name: true },
        },
        permission: true,
        relationship: true,
        createdAt: true,
      },
    });

    // Get pending invitations
    const invitations = await prisma.invitation.findMany({
      where: {
        studentProfileId: profileId,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        inviteeEmail: true,
        relationship: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // Combine into a single list
    const accessList = [
      ...accessGrants.map((grant) => ({
        id: grant.id,
        type: "active" as const,
        email: grant.grantedTo.email,
        name: grant.grantedTo.name,
        permission: grant.permission,
        relationship: grant.relationship,
        createdAt: grant.createdAt,
      })),
      ...invitations.map((inv) => ({
        id: inv.id,
        type: "pending" as const,
        email: inv.inviteeEmail,
        name: null,
        permission: "view",
        relationship: inv.relationship,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
      })),
    ];

    return NextResponse.json({ accessList });
  } catch (error) {
    console.error("[Account Access] GET error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/account-access
 * Invite a new email to access the profile
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const profileId = await requireProfile();

    const body = await request.json();
    const { email, relationship } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate relationship if provided
    const validRelationships = ["parent", "counselor", "tutor", "other"];
    if (relationship && !validRelationships.includes(relationship)) {
      return NextResponse.json(
        { error: "Invalid relationship type" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Can't invite yourself
    if (normalizedEmail === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You can't invite yourself" },
        { status: 400 }
      );
    }

    // Get the profile
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: { userId: true, firstName: true, lastName: true },
    });

    if (!profile || profile.userId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const studentName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ") || "the student";

    // Check if this email already has access
    const existingGrant = await prisma.accessGrant.findFirst({
      where: {
        studentProfileId: profileId,
        grantedTo: { email: normalizedEmail },
        revokedAt: null,
      },
    });

    if (existingGrant) {
      return NextResponse.json(
        { error: "This person already has access" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        studentProfileId: profileId,
        inviteeEmail: normalizedEmail,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An invitation has already been sent to this email" },
        { status: 400 }
      );
    }

    // Check if the invitee already has an account
    const inviteeUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (inviteeUser) {
      // User exists - create AccessGrant directly
      await prisma.accessGrant.create({
        data: {
          studentProfileId: profileId,
          grantedByUserId: user.id,
          grantedToUserId: inviteeUser.id,
          permission: "view",
          scope: "full",
          relationship: relationship || null,
        },
      });

      // Still send an email to let them know
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      await sendEmail({
        to: normalizedEmail,
        subject: `You now have access to ${studentName}'s profile on Sesame3`,
        react: InvitationEmail({
          inviterName: user.name || user.email,
          studentName,
          invitationUrl: baseUrl,
        }),
      });

      return NextResponse.json({
        success: true,
        message: "Access granted",
        type: "active",
      });
    }

    // User doesn't exist - create invitation
    const token = generateToken();
    const expiresAt = getInvitationExpiry();

    // Delete any old expired/revoked invitations for this email
    await prisma.invitation.deleteMany({
      where: {
        studentProfileId: profileId,
        inviteeEmail: normalizedEmail,
        status: { in: ["expired", "revoked"] },
      },
    });

    await prisma.invitation.create({
      data: {
        inviterUserId: user.id,
        studentProfileId: profileId,
        inviteeEmail: normalizedEmail,
        token,
        expiresAt,
        relationship: relationship || null,
      },
    });

    // Send invitation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const invitationUrl = `${baseUrl}/invite/${token}`;

    await sendEmail({
      to: normalizedEmail,
      subject: `You're invited to view ${studentName}'s college prep profile`,
      react: InvitationEmail({
        inviterName: user.name || user.email,
        studentName,
        invitationUrl,
      }),
    });

    return NextResponse.json({
      success: true,
      message: "Invitation sent",
      type: "pending",
    });
  } catch (error) {
    console.error("[Account Access] POST error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/account-access
 * Revoke access or cancel invitation
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth();
    const profileId = await requireProfile();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // "active" or "pending"

    if (!id || !type) {
      return NextResponse.json(
        { error: "ID and type are required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });

    if (!profile || profile.userId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (type === "active") {
      // Revoke access grant
      const grant = await prisma.accessGrant.findFirst({
        where: {
          id,
          studentProfileId: profileId,
          revokedAt: null,
        },
      });

      if (!grant) {
        return NextResponse.json(
          { error: "Access grant not found" },
          { status: 404 }
        );
      }

      await prisma.accessGrant.update({
        where: { id },
        data: { revokedAt: new Date() },
      });
    } else if (type === "pending") {
      // Cancel invitation
      const invitation = await prisma.invitation.findFirst({
        where: {
          id,
          studentProfileId: profileId,
          status: "pending",
        },
      });

      if (!invitation) {
        return NextResponse.json(
          { error: "Invitation not found" },
          { status: 404 }
        );
      }

      await prisma.invitation.update({
        where: { id },
        data: { status: "revoked" },
      });
    } else {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Account Access] DELETE error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
