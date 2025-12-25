// =============================================================================
// STRIPE CUSTOMER PORTAL API
// =============================================================================

import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

/**
 * POST /api/stripe/portal
 * Create a Stripe Customer Portal session for subscription management
 */
export async function POST() {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." },
        { status: 500 }
      );
    }
    
    const profileId = await requireProfile();
    
    // Get user's Stripe customer ID
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        user: {
          select: {
            stripeCustomerId: true,
          },
        },
      },
    });
    
    if (!profile?.user.stripeCustomerId) {
      return NextResponse.json(
        { error: "No subscription found. Please upgrade first." },
        { status: 400 }
      );
    }
    
    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.user.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}

