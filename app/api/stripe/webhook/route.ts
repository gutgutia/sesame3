/**
 * Stripe Webhook Handler
 *
 * Handles events from Stripe:
 * - checkout.session.completed: New subscription created
 * - customer.subscription.updated: Subscription changed (upgrade/downgrade)
 * - customer.subscription.deleted: Subscription canceled
 * - invoice.paid: Payment successful
 * - invoice.payment_failed: Payment failed
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Map Stripe price IDs to tiers
const PRICE_TO_TIER: Record<string, "standard" | "premium"> = {
  [process.env.STRIPE_PRICE_STANDARD_MONTHLY || ""]: "standard",
  [process.env.STRIPE_PRICE_STANDARD_YEARLY || ""]: "standard",
  [process.env.STRIPE_PRICE_PREMIUM_MONTHLY || ""]: "premium",
  [process.env.STRIPE_PRICE_PREMIUM_YEARLY || ""]: "premium",
};

export async function POST(request: NextRequest) {
  if (!stripe || !webhookSecret) {
    console.error("[Webhook] Stripe or webhook secret not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Webhook] No signature provided");
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[Webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[Webhook] Received event: ${event.type}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[Webhook] Error handling ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Webhook] Checkout completed:", session.id);

  const userId = session.metadata?.userId;
  const plan = session.metadata?.plan as "standard" | "premium" | undefined;

  if (!userId || !plan) {
    console.error("[Webhook] Missing userId or plan in checkout metadata");
    return;
  }

  // Get subscription details
  const subscriptionId = session.subscription as string;

  if (!subscriptionId) {
    console.error("[Webhook] No subscription ID in checkout session");
    return;
  }

  // Update user with subscription info
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: plan,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: session.customer as string,
    },
  });

  console.log(`[Webhook] User ${userId} upgraded to ${plan}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription updated:", subscription.id);

  // Find user by subscription ID
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.log("[Webhook] No user found for subscription:", subscription.id);
    return;
  }

  // Get tier from price
  const priceId = subscription.items.data[0]?.price?.id;
  const tier = priceId ? PRICE_TO_TIER[priceId] : null;

  if (!tier) {
    console.log("[Webhook] Could not determine tier from price:", priceId);
    return;
  }

  // Update subscription dates
  const subscriptionEndsAt = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: tier,
      subscriptionEndsAt,
    },
  });

  console.log(`[Webhook] User ${user.id} subscription updated to ${tier}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Webhook] Subscription deleted:", subscription.id);

  // Find user by subscription ID
  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!user) {
    console.log("[Webhook] No user found for subscription:", subscription.id);
    return;
  }

  // Revert to free tier
  await prisma.user.update({
    where: { id: user.id },
    data: {
      subscriptionTier: "free",
      stripeSubscriptionId: null,
      subscriptionEndsAt: null,
    },
  });

  console.log(`[Webhook] User ${user.id} reverted to free tier`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[Webhook] Invoice paid:", invoice.id);

  // Subscription renewals are handled by subscription.updated
  // This is mainly for logging/tracking
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (user) {
    console.log(`[Webhook] User ${user.id} payment successful`);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Webhook] Invoice payment failed:", invoice.id);

  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  const user = await prisma.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (user) {
    console.log(`[Webhook] User ${user.id} payment failed - may need follow-up`);
    // TODO: Send email notification about failed payment
  }
}
