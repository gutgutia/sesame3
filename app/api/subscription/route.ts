// =============================================================================
// SUBSCRIPTION MANAGEMENT API
// =============================================================================
// Handles: upgrade, cancel, reactivate
//
// Two-tier system: free and paid ($25/mo or $250/year)
//
// Proration Strategy:
// - Upgrade: Immediate effect, charge prorated difference
// - Cancel: Access until period ends, no refund
// - Reactivate: Removes cancel_at_period_end

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Helper to safely access Stripe subscription properties (SDK v20 compatibility)
type StripeSubscription = {
  id: string;
  status: string;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  items?: { data: Array<{ id: string; price?: { id: string } }> };
  [key: string]: unknown;
};

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" })
  : null;

// Price IDs (two-tier system)
const PRICE_IDS = {
  paid_monthly: process.env.STRIPE_PRICE_PAID_MONTHLY || process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  paid_yearly: process.env.STRIPE_PRICE_PAID_YEARLY || process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

/**
 * POST /api/subscription
 *
 * Actions:
 * - upgrade: Upgrade from free to paid (immediate)
 * - cancel: Cancel subscription (access until period ends)
 * - reactivate: Undo cancellation
 *
 * Body: { action: string, plan?: string, yearly?: boolean }
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
    const body = await request.json();
    const { action, plan, yearly = true, returnUrl = "/" } = body;

    // Validate action
    if (!["upgrade", "cancel", "reactivate", "switch-interval"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'upgrade', 'cancel', 'reactivate', or 'switch-interval'." },
        { status: 400 }
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

    const user = profile.user;

    // Route to appropriate handler
    switch (action) {
      case "upgrade":
        return handleUpgrade(user, yearly, returnUrl);
      case "cancel":
        return handleCancel(user);
      case "reactivate":
        return handleReactivate(user);
      case "switch-interval":
        return handleSwitchInterval(user, yearly);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Subscription action error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

// =============================================================================
// ACTION HANDLERS
// =============================================================================

type UserData = {
  id: string;
  email: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionTier: string;
};

/**
 * Handle upgrade from free to paid
 * - If no subscription: Return checkout URL
 * - If has subscription: Update inline with proration
 */
async function handleUpgrade(user: UserData, yearly: boolean, returnUrl: string = "/") {
  if (!stripe) throw new Error("Stripe not configured");

  // Check if already paid
  if (user.subscriptionTier === "paid") {
    return NextResponse.json(
      { error: "You already have a paid subscription." },
      { status: 400 }
    );
  }

  // Get price ID
  const priceKey = `paid_${yearly ? "yearly" : "monthly"}` as keyof typeof PRICE_IDS;
  const priceId = PRICE_IDS[priceKey];

  if (!priceId) {
    return NextResponse.json(
      { error: "Price not configured. Please contact support." },
      { status: 500 }
    );
  }

  // If user has no subscription, create checkout session
  if (!user.stripeSubscriptionId || user.subscriptionTier === "free") {
    return createCheckoutSession(user, priceId, yearly, returnUrl);
  }

  // User has subscription - update it inline
  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      // Subscription not active, create new checkout
      return createCheckoutSession(user, priceId, yearly, returnUrl);
    }

    // If subscription is managed by a schedule, release it first
    if (subscription.schedule) {
      try {
        await stripe.subscriptionSchedules.release(subscription.schedule as string);
        console.log(`[Subscription] Released existing schedule ${subscription.schedule}`);
      } catch {
        try {
          await stripe.subscriptionSchedules.cancel(subscription.schedule as string);
          console.log(`[Subscription] Canceled existing schedule ${subscription.schedule}`);
        } catch {
          console.log(`[Subscription] Could not release/cancel schedule, continuing...`);
        }
      }
    }

    // Update subscription with proration (immediate charge for difference)
    // "always_invoice" creates an invoice immediately and charges the customer
    const updatedSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "always_invoice",
        // Remove any pending cancellation
        cancel_at_period_end: false,
      }
    );

    // Update database
    const sub = updatedSubscription as unknown as StripeSubscription;
    const subscriptionEndsAt = sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : null;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: "paid",
        subscriptionEndsAt,
      },
    });

    console.log(`[Subscription] User ${user.id} upgraded to paid`);

    return NextResponse.json({
      success: true,
      message: "Successfully upgraded to Premium!",
      tier: "paid",
      immediate: true,
    });
  } catch (err) {
    console.error("[Subscription] Upgrade error:", err);
    // Fallback to checkout
    return createCheckoutSession(user, priceId, yearly, returnUrl);
  }
}

/**
 * Handle subscription cancellation
 * - Sets cancel_at_period_end
 * - User keeps access until period ends
 */
async function handleCancel(user: UserData) {
  if (!stripe) throw new Error("Stripe not configured");

  if (!user.stripeSubscriptionId || user.subscriptionTier === "free") {
    return NextResponse.json(
      { error: "No active subscription to cancel" },
      { status: 400 }
    );
  }

  try {
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    console.log(`[Subscription] User ${user.id} scheduled cancellation`);

    const cancelledSub = subscription as unknown as StripeSubscription;
    const accessUntil = cancelledSub.current_period_end
      ? new Date(cancelledSub.current_period_end * 1000)
      : null;

    return NextResponse.json({
      success: true,
      message: accessUntil
        ? `Your subscription will end on ${accessUntil.toLocaleDateString()}. You'll have access until then.`
        : "Your subscription has been canceled.",
      accessUntil: accessUntil?.toISOString() || null,
    });
  } catch (err) {
    console.error("[Subscription] Cancel error:", err);
    return NextResponse.json(
      { error: "Failed to cancel subscription. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription reactivation
 * - Removes cancel_at_period_end
 */
async function handleReactivate(user: UserData) {
  if (!stripe) throw new Error("Stripe not configured");

  if (!user.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No subscription to reactivate" },
      { status: 400 }
    );
  }

  try {
    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: false }
    );

    console.log(`[Subscription] User ${user.id} reactivated subscription`);

    const reactivatedSub = subscription as unknown as StripeSubscription;
    const nextBilling = reactivatedSub.current_period_end
      ? new Date(reactivatedSub.current_period_end * 1000)
      : null;

    return NextResponse.json({
      success: true,
      message: "Your subscription has been reactivated!",
      nextBilling: nextBilling?.toISOString() || null,
    });
  } catch (err) {
    console.error("[Subscription] Reactivate error:", err);
    return NextResponse.json(
      { error: "Failed to reactivate subscription. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * Handle billing interval switch (monthly <-> yearly)
 * - Only monthly -> yearly is supported
 * - Applies proration (credit for unused monthly, charge yearly)
 */
async function handleSwitchInterval(user: UserData, toYearly: boolean) {
  if (!stripe) throw new Error("Stripe not configured");

  // Only monthly -> yearly switch is supported
  if (!toYearly) {
    return NextResponse.json(
      { error: "Switching from yearly to monthly is not supported. Please cancel and resubscribe." },
      { status: 400 }
    );
  }

  // Must have active subscription
  if (!user.stripeSubscriptionId || user.subscriptionTier !== "paid") {
    return NextResponse.json(
      { error: "No active subscription to modify" },
      { status: 400 }
    );
  }

  const yearlyPriceId = PRICE_IDS.paid_yearly;
  if (!yearlyPriceId) {
    return NextResponse.json(
      { error: "Yearly price not configured" },
      { status: 500 }
    );
  }

  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      return NextResponse.json(
        { error: "Subscription is not active" },
        { status: 400 }
      );
    }

    // Check if already on yearly
    const currentPriceId = subscription.items.data[0]?.price?.id;
    if (currentPriceId === yearlyPriceId) {
      return NextResponse.json(
        { error: "You're already on annual billing" },
        { status: 400 }
      );
    }

    // If subscription is managed by a schedule, release it first
    if (subscription.schedule) {
      try {
        await stripe.subscriptionSchedules.release(subscription.schedule as string);
        console.log(`[Subscription] Released existing schedule ${subscription.schedule}`);
      } catch {
        try {
          await stripe.subscriptionSchedules.cancel(subscription.schedule as string);
          console.log(`[Subscription] Canceled existing schedule ${subscription.schedule}`);
        } catch {
          console.log(`[Subscription] Could not release/cancel schedule, continuing...`);
        }
      }
    }

    // Update subscription to yearly with proration
    // "always_invoice" creates an invoice immediately and charges the customer
    const updatedSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: yearlyPriceId,
          },
        ],
        proration_behavior: "always_invoice",
        cancel_at_period_end: false,
      }
    );

    console.log(`[Subscription] User ${user.id} switched from monthly to yearly (invoice created)`);

    const updatedSub = updatedSubscription as unknown as StripeSubscription;
    const subscriptionEndsAt = updatedSub.current_period_end
      ? new Date(updatedSub.current_period_end * 1000)
      : null;

    // Update database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionEndsAt,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Successfully switched to annual billing! You save $50/year.",
      nextBilling: subscriptionEndsAt?.toISOString() || null,
    });
  } catch (err) {
    console.error("[Subscription] Switch interval error:", err);
    return NextResponse.json(
      { error: "Failed to switch billing interval. Please try again." },
      { status: 500 }
    );
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a Stripe Checkout session for new subscriptions
 */
async function createCheckoutSession(
  user: UserData,
  priceId: string,
  yearly: boolean,
  returnUrl: string = "/"
) {
  if (!stripe) throw new Error("Stripe not configured");

  // Create or get customer
  let customerId = user.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });

    customerId = customer.id;
  }

  // Create checkout session with dynamic return URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}${returnUrl}?upgraded=true&plan=paid`,
    cancel_url: `${baseUrl}${returnUrl}?canceled=true`,
    metadata: {
      userId: user.id,
      plan: "paid",
      yearly: yearly ? "true" : "false",
    },
  });

  return NextResponse.json({
    success: true,
    checkoutUrl: session.url,
    message: "Redirecting to checkout...",
  });
}
