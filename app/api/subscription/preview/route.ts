// =============================================================================
// SUBSCRIPTION UPGRADE PREVIEW API
// =============================================================================
// Returns the proration amount for an upgrade so user can confirm

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Helper type for Stripe SDK v20 compatibility
type StripeSubscription = { current_period_end?: number; [key: string]: unknown };

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" })
  : null;

// Price IDs (two-tier system: free and paid)
const PRICE_IDS: Record<string, string | undefined> = {
  paid_monthly: process.env.STRIPE_PRICE_PAID_MONTHLY || process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  paid_yearly: process.env.STRIPE_PRICE_PAID_YEARLY || process.env.STRIPE_PRICE_PREMIUM_YEARLY,
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
    // Two-tier pricing: $25/month or $250/year
    if (!user.stripeSubscriptionId || user.subscriptionTier === "free") {
      const price = yearly ? 250 : 25;

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
    
    // Get price ID for new plan (two-tier system)
    const priceKey = `paid_${yearly ? "yearly" : "monthly"}`;
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

    // Parse line items from Stripe's invoice preview
    // Stripe returns: proration credits, proration charges, and next billing cycle
    // We only want the proration items (charged today), not the next billing cycle
    const lineItems = preview.lines.data.map(line => {
      const item = line as unknown as { description?: string; amount?: number };
      const desc = item.description || "";
      // Proration items have "Unused time" or "Remaining time" in description
      // Regular subscription charges have "1 × Plan Name (at $X / interval)"
      const isProration = desc.includes("Unused time") || desc.includes("Remaining time");
      const amountDollars = (item.amount || 0) / 100; // Stripe returns cents
      return { description: desc, amount: amountDollars, isProration };
    });

    // Log what Stripe returned
    console.log("[Preview] Stripe line items:", lineItems.map(l => `${l.description}: $${l.amount.toFixed(2)} (proration: ${l.isProration})`));

    // Sum only proration items = immediate charge today
    const immediateCharge = lineItems
      .filter(item => item.isProration)
      .reduce((sum, item) => sum + item.amount, 0);

    // Round to 2 decimal places
    const totalAmountDollars = Math.round(immediateCharge * 100) / 100;

    console.log(`[Preview] Charge today (from Stripe proration): $${totalAmountDollars.toFixed(2)}`);

    const sub = subscription as unknown as StripeSubscription;

    return NextResponse.json({
      isNewSubscription: false,
      totalAmount: Math.max(0, totalAmountDollars), // In dollars, from Stripe
      currency: "usd",
      message: totalAmountDollars > 0
        ? `You'll be charged $${totalAmountDollars.toFixed(2)} today.`
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

