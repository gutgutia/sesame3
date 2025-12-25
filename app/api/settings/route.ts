// =============================================================================
// SETTINGS API
// =============================================================================

import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/settings
 * Get current user's settings
 */
export async function GET() {
  try {
    const profileId = await requireProfile();
    
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        user: {
          select: {
            email: true,
            subscriptionTier: true,
            subscriptionEndsAt: true,
            stripeCustomerId: true,
          },
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    return NextResponse.json({
      email: profile.user.email,
      subscriptionTier: profile.user.subscriptionTier,
      subscriptionEndsAt: profile.user.subscriptionEndsAt?.toISOString() || null,
      hasStripeCustomer: !!profile.user.stripeCustomerId,
    });
  } catch (error) {
    console.error("Settings error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

