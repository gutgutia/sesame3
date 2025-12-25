// =============================================================================
// STRIPE CHECKOUT API
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

// Price IDs from Stripe Dashboard (set these after creating products)
const PRICE_IDS = {
  standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
  standard_yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY,
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout Session for subscription upgrade
 * 
 * Body: { plan: "standard" | "premium", yearly: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables." },
        { status: 500 }
      );
    }
    
    const profileId = await requireProfile();
    const { plan, yearly } = await request.json();
    
    // Validate plan
    if (!["standard", "premium"].includes(plan)) {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'standard' or 'premium'." },
        { status: 400 }
      );
    }
    
    // Get price ID
    const priceKey = `${plan}_${yearly ? "yearly" : "monthly"}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];
    
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for ${plan} ${yearly ? "yearly" : "monthly"}. Please set STRIPE_PRICE_* environment variables.` },
        { status: 500 }
      );
    }
    
    // Get user
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            stripeCustomerId: true,
          },
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    // Create or get Stripe customer
    let customerId = profile.user.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.user.email,
        metadata: {
          userId: profile.user.id,
        },
      });
      
      // Save customer ID to database
      await prisma.user.update({
        where: { id: profile.user.id },
        data: { stripeCustomerId: customer.id },
      });
      
      customerId = customer.id;
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?canceled=true`,
      metadata: {
        userId: profile.user.id,
        plan,
        yearly: yearly ? "true" : "false",
      },
    });
    
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}

