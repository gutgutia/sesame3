/**
 * POST /api/auth/google-callback
 *
 * Handles the Google OAuth callback from the client-side.
 * Creates/updates the user and sets session cookies.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { WelcomeEmail } from "@/lib/email/templates";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, redirect = "/" } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: "Access token is required" },
        { status: 400 }
      );
    }

    // Create Supabase client and get user from the access token
    const supabase = await createClient();
    const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser(accessToken);

    if (userError || !supabaseUser) {
      console.error("[Google Callback] Error getting user:", userError);
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      );
    }

    if (!supabaseUser.email) {
      console.error("[Google Callback] No email in user data");
      return NextResponse.json(
        { error: "No email associated with account" },
        { status: 400 }
      );
    }

    const normalizedEmail = supabaseUser.email.toLowerCase().trim();

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const isNewUser = !user;

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
          avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
          authProvider: "google",
          emailVerified: true,
          lastLoginAt: new Date(),
        },
      });

      // Send welcome email (async, don't block)
      const userName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name;
      sendEmail({
        to: normalizedEmail,
        subject: "Welcome to Sesame3!",
        react: WelcomeEmail({ name: userName }),
        text: "Welcome to Sesame3! We're excited to help you on your college prep journey.",
      }).catch((err) => {
        console.error("[Google Callback] Failed to send welcome email:", err);
      });
    } else {
      // Update existing user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          // Update name/avatar if they were previously null
          ...(user.name ? {} : { name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name }),
          ...(user.avatarUrl ? {} : { avatarUrl: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture }),
          // Update authProvider if it was email before
          ...(user.authProvider === "email" ? { authProvider: "google" } : {}),
        },
      });
    }

    // Set our custom session cookies
    const cookieStore = await cookies();

    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: user.id,
        email: user.email,
        createdAt: Date.now(),
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      })
    ).toString("base64");

    cookieStore.set("sesame_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: "/",
    });

    cookieStore.set("sesame_user_id", user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/",
    });

    // Check for pending invitations and auto-accept them
    const pendingInvitations = await prisma.invitation.findMany({
      where: {
        inviteeEmail: normalizedEmail,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
    });

    for (const invitation of pendingInvitations) {
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

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "accepted",
          acceptedAt: new Date(),
        },
      });
    }

    // Determine redirect
    let redirectTo = redirect;
    if (isNewUser) {
      // Check if user has any access grants (was invited)
      const hasAccessGrants = await prisma.accessGrant.findFirst({
        where: {
          grantedToUserId: user.id,
          revokedAt: null,
        },
      });

      // If they have access grants but are new, skip onboarding
      if (!hasAccessGrants) {
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
    console.error("[Google Callback] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to complete authentication" },
      { status: 500 }
    );
  }
}
