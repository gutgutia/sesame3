// =============================================================================
// SUBSCRIPTION MANAGEMENT API
// =============================================================================
// Handles: upgrade, downgrade, cancel, reactivate
// 
// Proration Strategy:
// - Upgrade: Immediate effect, charge prorated difference
// - Downgrade: Scheduled for end of period (user keeps current tier until then)
// - Cancel: Access until period ends, no refund
// - Reactivate: Removes cancel_at_period_end

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

// Price IDs
const PRICE_IDS: Record<string, string | undefined> = {
  standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
  standard_yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY,
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

// Tier hierarchy for upgrade/downgrade detection
const TIER_LEVELS: Record<string, number> = {
  free: 0,
  standard: 1,
  premium: 2,
};

/**
 * POST /api/subscription
 * 
 * Actions:
 * - upgrade: Upgrade to a higher tier (immediate, with proration)
 * - downgrade: Downgrade to a lower tier (scheduled for end of period)
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
    if (!["upgrade", "downgrade", "cancel", "reactivate"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action" },
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
        return handleUpgrade(user, plan, yearly, returnUrl);
      case "downgrade":
        return handleDowngrade(user, plan, yearly);
      case "cancel":
        return handleCancel(user);
      case "reactivate":
        return handleReactivate(user);
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
 * Handle upgrade to a higher tier
 * - If no subscription: Return checkout URL
 * - If has subscription: Update inline with proration
 */
async function handleUpgrade(user: UserData, plan: string, yearly: boolean, returnUrl: string = "/") {
  if (!stripe) throw new Error("Stripe not configured");
  
  // Validate plan
  if (!["standard", "premium"].includes(plan)) {
    return NextResponse.json(
      { error: "Invalid plan. Must be 'standard' or 'premium'." },
      { status: 400 }
    );
  }
  
  // Check it's actually an upgrade
  const currentLevel = TIER_LEVELS[user.subscriptionTier] || 0;
  const newLevel = TIER_LEVELS[plan];
  
  if (newLevel <= currentLevel) {
    return NextResponse.json(
      { error: "This is not an upgrade. Use downgrade action instead." },
      { status: 400 }
    );
  }
  
  // Get price ID
  const priceKey = `${plan}_${yearly ? "yearly" : "monthly"}`;
  const priceId = PRICE_IDS[priceKey];
  
  if (!priceId) {
    return NextResponse.json(
      { error: `Price not configured for ${plan}` },
      { status: 500 }
    );
  }
  
  // If user has no subscription, create checkout session
  if (!user.stripeSubscriptionId || user.subscriptionTier === "free") {
    return createCheckoutSession(user, plan, priceId, yearly, returnUrl);
  }
  
  // User has subscription - update it inline
  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    if (subscription.status !== "active" && subscription.status !== "trialing") {
      // Subscription not active, create new checkout
      return createCheckoutSession(user, plan, priceId, yearly);
    }
    
    // If subscription is managed by a schedule, release it first
    if (subscription.schedule) {
      try {
        await stripe.subscriptionSchedules.release(subscription.schedule as string);
        console.log(`[Subscription] Released existing schedule ${subscription.schedule}`);
      } catch (scheduleErr) {
        // If release fails, try to cancel
        try {
          await stripe.subscriptionSchedules.cancel(subscription.schedule as string);
          console.log(`[Subscription] Canceled existing schedule ${subscription.schedule}`);
        } catch {
          console.log(`[Subscription] Could not release/cancel schedule, continuing...`);
        }
      }
    }
    
    // Update subscription with proration (immediate charge for difference)
    const updatedSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "create_prorations",
        // Remove any pending cancellation
        cancel_at_period_end: false,
      }
    );
    
    // Update database
    const tier = plan as "standard" | "premium";
    const subscriptionEndsAt = updatedSubscription.current_period_end
      ? new Date(updatedSubscription.current_period_end * 1000)
      : null;
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: tier,
        subscriptionEndsAt,
      },
    });
    
    console.log(`[Subscription] User ${user.id} upgraded to ${plan}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully upgraded to ${plan}!`,
      tier,
      immediate: true,
    });
  } catch (err) {
    console.error("[Subscription] Upgrade error:", err);
    // Fallback to checkout
    return createCheckoutSession(user, plan, priceId, yearly, returnUrl);
  }
}

/**
 * Handle downgrade to a lower tier
 * - For simplicity, we update the subscription immediately but with no proration
 * - This means the user pays the new lower price at their next billing date
 * - They get the new (lower) tier immediately
 * 
 * Alternative: Use subscription schedules for true "keep current tier until period end"
 * but that's complex and error-prone with the Stripe API.
 */
async function handleDowngrade(user: UserData, plan: string, yearly: boolean) {
  if (!stripe) throw new Error("Stripe not configured");
  
  // Validate plan
  if (!["standard"].includes(plan)) {
    return NextResponse.json(
      { error: "Can only downgrade to 'standard'. To cancel entirely, use cancel action." },
      { status: 400 }
    );
  }
  
  // Check it's actually a downgrade
  const currentLevel = TIER_LEVELS[user.subscriptionTier] || 0;
  const newLevel = TIER_LEVELS[plan];
  
  if (newLevel >= currentLevel) {
    return NextResponse.json(
      { error: "This is not a downgrade. Use upgrade action instead." },
      { status: 400 }
    );
  }
  
  if (!user.stripeSubscriptionId) {
    return NextResponse.json(
      { error: "No active subscription to downgrade" },
      { status: 400 }
    );
  }
  
  // Get price ID
  const priceKey = `${plan}_${yearly ? "yearly" : "monthly"}`;
  const priceId = PRICE_IDS[priceKey];
  
  if (!priceId) {
    return NextResponse.json(
      { error: `Price not configured for ${plan}` },
      { status: 500 }
    );
  }
  
  try {
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    
    // If subscription is managed by a schedule, release it first
    if (subscription.schedule) {
      try {
        await stripe.subscriptionSchedules.release(subscription.schedule as string);
        console.log(`[Subscription] Released existing schedule ${subscription.schedule}`);
      } catch (scheduleErr) {
        // If release fails, try to cancel
        try {
          await stripe.subscriptionSchedules.cancel(subscription.schedule as string);
          console.log(`[Subscription] Canceled existing schedule ${subscription.schedule}`);
        } catch {
          console.log(`[Subscription] Could not release/cancel schedule, continuing...`);
        }
      }
    }
    
    // Update subscription with no proration (change takes effect at next billing)
    // Using proration_behavior: 'none' means no immediate charge/credit
    const updatedSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: "none",
        // Remove any pending cancellation
        cancel_at_period_end: false,
      }
    );
    
    // Update database
    const tier = plan as "standard" | "premium";
    
    // Calculate when the new price takes effect
    const rawSub = updatedSubscription as unknown as Record<string, unknown>;
    const periodEnd = rawSub.current_period_end as number | undefined;
    
    let subscriptionEndsAt: Date | null = null;
    if (periodEnd) {
      subscriptionEndsAt = new Date(periodEnd * 1000);
    } else if (updatedSubscription.billing_cycle_anchor) {
      // Calculate from billing anchor
      const anchor = new Date(updatedSubscription.billing_cycle_anchor * 1000);
      const interval = yearly ? "year" : "month";
      const now = new Date();
      let nextBilling = new Date(anchor);
      while (nextBilling <= now) {
        if (interval === "month") {
          nextBilling.setMonth(nextBilling.getMonth() + 1);
        } else {
          nextBilling.setFullYear(nextBilling.getFullYear() + 1);
        }
      }
      subscriptionEndsAt = nextBilling;
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: tier,
        subscriptionEndsAt,
      },
    });
    
    console.log(`[Subscription] User ${user.id} switched to ${plan}`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully switched to ${plan}!`,
      tier,
      immediate: true,
    });
  } catch (err) {
    console.error("[Subscription] Downgrade error:", err);
    return NextResponse.json(
      { error: "Failed to switch plan. Please try again." },
      { status: 500 }
    );
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
    
    const accessUntil = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
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
    
    const nextBilling = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
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

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Create a Stripe Checkout session for new subscriptions
 */
async function createCheckoutSession(
  user: UserData,
  plan: string,
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
    success_url: `${baseUrl}${returnUrl}?upgraded=true&plan=${plan}`,
    cancel_url: `${baseUrl}${returnUrl}?canceled=true`,
    metadata: {
      userId: user.id,
      plan,
      yearly: yearly ? "true" : "false",
    },
  });

  return NextResponse.json({
    success: true,
    checkoutUrl: session.url,
    message: "Redirecting to checkout...",
  });
}
