/**
 * POST /api/auth/verify-code
 *
 * Verifies the OTP code and creates a session.
 * For new users, also creates the User record and sends a welcome email.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { SignupNotificationEmail, WelcomeEmail } from "@/lib/email/templates";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    // Validate inputs
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Verification code is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.replace(/\s/g, ""); // Remove any spaces

    // Find the most recent valid code for this email
    const authCode = await prisma.authCode.findFirst({
      where: {
        email: normalizedEmail,
        usedAt: null, // Not already used
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!authCode) {
      return NextResponse.json(
        { error: "No valid verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Check if max attempts exceeded
    if (authCode.attempts >= authCode.maxAttempts) {
      return NextResponse.json(
        { error: "Too many failed attempts. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify the code
    if (authCode.code !== normalizedCode) {
      // Increment attempt counter
      await prisma.authCode.update({
        where: { id: authCode.id },
        data: { attempts: authCode.attempts + 1 },
      });

      const attemptsRemaining = authCode.maxAttempts - authCode.attempts - 1;
      return NextResponse.json(
        {
          error: `Invalid code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} remaining.`,
        },
        { status: 400 }
      );
    }

    // Code is valid! Mark it as used
    await prisma.authCode.update({
      where: { id: authCode.id },
      data: { usedAt: new Date() },
    });

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const isNewUser = !user;

    // Create user if they don't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          authProvider: "email",
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      // Send welcome email (async, don't block)
      sendEmail({
        to: normalizedEmail,
        subject: "Welcome to Sesame3!",
        react: WelcomeEmail({}),
        text: "Welcome to Sesame3! We're excited to help you on your college prep journey.",
      }).catch((err) => {
        console.error("[Auth] Failed to send welcome email:", err);
      });

      // Notify admin of new signup (async, don't block)
      sendEmail({
        to: "abhishek.gutgutia@gmail.com",
        subject: `New signup: ${normalizedEmail}`,
        react: SignupNotificationEmail({ userEmail: normalizedEmail }),
        text: `New user signed up: ${normalizedEmail}`,
      }).catch((err) => {
        console.error("[Auth] Failed to send signup notification:", err);
      });
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          emailVerified: true,
        },
      });
    }

    // Create Supabase session
    // Note: We're using Supabase's admin API to create a session
    // This requires the service role key
    const supabase = await createClient();

    // For now, we'll use a custom session approach
    // Set a secure HTTP-only cookie with the user ID
    const cookieStore = await cookies();

    // Create a session token (in production, use proper JWT)
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      })
    ).toString("base64");

    // Set session cookie
    cookieStore.set("sesame_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    // Also set user ID cookie as fallback for session edge cases
    cookieStore.set("sesame_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    // Check for pending invitations for this email and auto-accept them
    const pendingInvitations = await prisma.invitation.findMany({
      where: {
        inviteeEmail: normalizedEmail,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    for (const invitation of pendingInvitations) {
      // Check if grant already exists
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
    }

    // Determine redirect
    let redirectTo = "/dashboard";
    if (isNewUser) {
      // Check if user has any access grants (meaning they were invited)
      const hasAccessGrants = await prisma.accessGrant.findFirst({
        where: {
          grantedToUserId: user.id,
          revokedAt: null,
        },
      });

      // If they have access grants but are new, skip onboarding
      // They're likely a parent/viewer who doesn't need their own profile
      if (hasAccessGrants) {
        redirectTo = "/dashboard";
      } else {
        redirectTo = "/onboarding";
      }
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        email: user.email,
      },
      redirectTo,
    });
  } catch (error) {
    console.error("[Auth] Error verifying code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
