// =============================================================================
// STRIPE CHECKOUT API
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Helper type for Stripe subscription (SDK v20 compatibility)
type StripeSubscription = { current_period_end?: number; [key: string]: unknown };

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" })
  : null;

// Price IDs from Stripe Dashboard (set these after creating products)
// Two-tier system: free and paid ($25/mo or $250/year)
const PRICE_IDS = {
  paid_monthly: process.env.STRIPE_PRICE_PAID_MONTHLY || process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  paid_yearly: process.env.STRIPE_PRICE_PAID_YEARLY || process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

/**
 * POST /api/stripe/checkout
 * Create a Stripe Checkout Session for subscription upgrade
 * OR update existing subscription if user already has one
 *
 * Body: { plan: "paid", yearly: boolean }
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

    // Validate plan - only "paid" is valid now (also accept legacy "premium"/"standard")
    const normalizedPlan = ["paid", "premium", "standard"].includes(plan) ? "paid" : null;
    if (!normalizedPlan) {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'paid'." },
        { status: 400 }
      );
    }

    // Get price ID
    const priceKey = `paid_${yearly ? "yearly" : "monthly"}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];
    
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for ${plan} ${yearly ? "yearly" : "monthly"}. Please set STRIPE_PRICE_* environment variables.` },
        { status: 500 }
      );
    }
    
    // Get user with subscription info
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            stripeCustomerId: true,
            stripeSubscriptionId: true,
            subscriptionTier: true,
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
    
    // If user already has an active subscription, update it instead of creating new
    if (profile.user.stripeSubscriptionId && profile.user.subscriptionTier !== "free") {
      try {
        // Get current subscription
        const currentSubscription = await stripe.subscriptions.retrieve(
          profile.user.stripeSubscriptionId
        );
        
        // Check if subscription is active
        if (currentSubscription.status === "active" || currentSubscription.status === "trialing") {
          // Update the subscription to the new price
          const updatedSubscription = await stripe.subscriptions.update(
            profile.user.stripeSubscriptionId,
            {
              items: [
                {
                  id: currentSubscription.items.data[0].id,
                  price: priceId,
                },
              ],
              proration_behavior: "create_prorations", // Prorate the charge
              metadata: {
                userId: profile.user.id,
                plan,
                yearly: yearly ? "true" : "false",
              },
            }
          );
          
          // Update our database with new tier
          const sub = updatedSubscription as unknown as StripeSubscription;
          const subscriptionEndsAt = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null;

          await prisma.user.update({
            where: { id: profile.user.id },
            data: {
              subscriptionTier: "paid",
              subscriptionEndsAt,
            },
          });

          console.log(`[Stripe] Updated subscription for user ${profile.user.id} to paid`);

          // Return success without redirect (subscription updated inline)
          return NextResponse.json({
            success: true,
            message: "Subscription updated successfully",
            tier: "paid",
          });
        }
      } catch (err) {
        // Subscription doesn't exist or is canceled, proceed with new checkout
        console.log("[Stripe] Existing subscription not found or inactive, creating new checkout");
      }
    }
    
    // No existing subscription, create checkout session for new subscription
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
        plan: "paid",
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

