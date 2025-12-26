// =============================================================================
// SUBSCRIPTION UPGRADE PREVIEW API
// =============================================================================
// Returns the proration amount for an upgrade so user can confirm

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Helper types for Stripe SDK v20 compatibility
type StripeSubscription = { current_period_end?: number; [key: string]: unknown };
type StripeInvoiceLineItem = { proration?: boolean; amount?: number; [key: string]: unknown };

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" })
  : null;

// Price IDs
const PRICE_IDS: Record<string, string | undefined> = {
  standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
  standard_yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY,
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

/**
 * POST /api/subscription/preview
 * 
 * Get proration preview for an upgrade
 * Body: { plan: string, yearly: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 500 }
      );
    }
    
    const profileId = await requireProfile();
    const { plan, yearly = true } = await request.json();
    
    // Get user
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        user: {
          select: {
            stripeSubscriptionId: true,
            subscriptionTier: true,
          },
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    const user = profile.user;
    
    // If no existing subscription, no proration - just show the full price
    if (!user.stripeSubscriptionId || user.subscriptionTier === "free") {
      const priceKey = `${plan}_${yearly ? "yearly" : "monthly"}`;
      const price = plan === "premium" 
        ? (yearly ? 249 : 24.99)
        : (yearly ? 99 : 9.99);
      
      return NextResponse.json({
        isNewSubscription: true,
        totalAmount: price,
        currency: "usd",
        message: `You'll be charged $${price.toFixed(2)} ${yearly ? "per year" : "per month"}.`,
      });
    }
    
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }
    
    // Get price ID for new plan
    const priceKey = `${plan}_${yearly ? "yearly" : "monthly"}`;
    const priceId = PRICE_IDS[priceKey];
    
    if (!priceId) {
      return NextResponse.json({ error: "Price not configured" }, { status: 500 });
    }
    
    // Create invoice preview to get proration amount
    const preview = await stripe.invoices.createPreview({
      customer: subscription.customer as string,
      subscription: subscription.id,
      subscription_details: {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
      },
    });
    
    // Calculate amounts
    const prorationAmount = preview.lines.data
      .filter(line => (line as unknown as StripeInvoiceLineItem).proration)
      .reduce((sum, line) => sum + (line as unknown as StripeInvoiceLineItem).amount!, 0);

    const totalAmount = preview.amount_due;
    const sub = subscription as unknown as StripeSubscription;

    return NextResponse.json({
      isNewSubscription: false,
      prorationAmount: prorationAmount / 100, // Convert from cents
      totalAmount: totalAmount / 100,
      currency: preview.currency,
      message: totalAmount > 0
        ? `You'll be charged $${(totalAmount / 100).toFixed(2)} now for the upgrade.`
        : "No charge - you have credit from your current plan.",
      periodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to calculate proration" },
      { status: 500 }
    );
  }
}

