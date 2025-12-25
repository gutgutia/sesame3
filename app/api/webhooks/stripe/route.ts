// =============================================================================
// STRIPE WEBHOOK HANDLER
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 * 
 * Key events:
 * - checkout.session.completed: User completed payment
 * - customer.subscription.updated: Subscription changed (upgrade/downgrade)
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.payment_failed: Payment failed
 */
export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    console.error("Stripe webhook not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// =============================================================================
// WEBHOOK HANDLERS
// =============================================================================

/**
 * Handle checkout.session.completed
 * User just completed payment for a new subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan;

  if (!userId || !plan) {
    console.error("[Stripe] Checkout session missing metadata:", session.id);
    return;
  }

  console.log(`[Stripe] User ${userId} subscribed to ${plan}`);

  // Map plan to tier
  const tier = plan === "premium" ? "premium" : "standard";

  // Get subscription details for end date
  let subscriptionEndsAt: Date | null = null;
  if (session.subscription && stripe) {
    try {
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
        subscriptionEndsAt = new Date(subscription.current_period_end * 1000);
      }
    } catch (err) {
      console.error("[Stripe] Failed to retrieve subscription details:", err);
    }
  }

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier,
      subscriptionEndsAt,
      stripeSubscriptionId: session.subscription as string,
    },
  });

  console.log(`[Stripe] Updated user ${userId} to ${tier} tier`);
}

/**
 * Handle customer.subscription.updated
 * Subscription was modified (plan change, renewal, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Stripe] User not found for customer: ${customerId}`);
    return;
  }

  // Determine tier from price
  const priceId = subscription.items.data[0]?.price.id;
  let tier: "free" | "standard" | "premium" = "free";

  if (priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 
      priceId === process.env.STRIPE_PRICE_PREMIUM_YEARLY) {
    tier = "premium";
  } else if (priceId === process.env.STRIPE_PRICE_STANDARD_MONTHLY || 
             priceId === process.env.STRIPE_PRICE_STANDARD_YEARLY) {
    tier = "standard";
  }

  // Check subscription status
  const isActive = subscription.status === "active" || subscription.status === "trialing";
  
  // Safely parse subscription end date
  let subscriptionEndsAt: Date | null = null;
  if (subscription.current_period_end && typeof subscription.current_period_end === 'number') {
    subscriptionEndsAt = new Date(subscription.current_period_end * 1000);
  }

  console.log(`[Stripe] Subscription updated for user ${user.id}: ${tier}, active: ${isActive}`);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: isActive ? tier : "free",
      subscriptionEndsAt: isActive ? subscriptionEndsAt : null,
      stripeSubscriptionId: isActive ? subscription.id : null,
    },
  });
}

/**
 * Handle customer.subscription.deleted
 * Subscription was canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Stripe] User not found for customer: ${customerId}`);
    return;
  }

  console.log(`[Stripe] Subscription canceled for user ${user.id}`);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: "free",
      subscriptionEndsAt: null,
      stripeSubscriptionId: null,
    },
  });
}

/**
 * Handle invoice.payment_failed
 * Payment failed (card declined, expired, etc.)
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user by Stripe customer ID
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (!user) {
    console.error(`[Stripe] User not found for customer: ${customerId}`);
    return;
  }

  console.log(`[Stripe] Payment failed for user ${user.id}`);

  // Note: Stripe will retry the payment based on your dunning settings.
  // After all retries fail, it will send customer.subscription.deleted.
  // For now, we just log it. Could send an email notification here.
}

