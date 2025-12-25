// =============================================================================
// SETTINGS API
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
 * Subscription status types
 */
type SubscriptionStatus = "none" | "active" | "canceling" | "past_due";

/**
 * GET /api/settings
 * Get current user's settings including real-time subscription status from Stripe
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
            stripeSubscriptionId: true,
          },
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    
    const user = profile.user;
    
    // Default subscription state
    let subscription = {
      tier: user.subscriptionTier as "free" | "standard" | "premium",
      status: "none" as SubscriptionStatus,
      currentPeriodEnd: null as string | null,
      cancelAtPeriodEnd: false,
      interval: null as "month" | "year" | null,
      amount: null as number | null,
    };
    
    // If user has a Stripe subscription, get real-time status
    if (stripe && user.stripeSubscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          user.stripeSubscriptionId
        );
        
        // Get price details
        const priceId = stripeSubscription.items.data[0]?.price.id;
        const price = stripeSubscription.items.data[0]?.price;
        
        // Determine tier from price
        let tier: "free" | "standard" | "premium" = "free";
        
        if (priceId === process.env.STRIPE_PRICE_PREMIUM_MONTHLY || 
            priceId === process.env.STRIPE_PRICE_PREMIUM_YEARLY) {
          tier = "premium";
        } else if (priceId === process.env.STRIPE_PRICE_STANDARD_MONTHLY || 
                   priceId === process.env.STRIPE_PRICE_STANDARD_YEARLY) {
          tier = "standard";
        }
        
        // Determine status
        let status: SubscriptionStatus = "none";
        if (stripeSubscription.status === "active" || stripeSubscription.status === "trialing") {
          status = stripeSubscription.cancel_at_period_end ? "canceling" : "active";
        } else if (stripeSubscription.status === "past_due") {
          status = "past_due";
        } else if (stripeSubscription.status === "canceled") {
          tier = "free";
          status = "none";
        }
        
        // Get interval and amount from price
        const interval = price?.recurring?.interval as "month" | "year" | null;
        const amount = price?.unit_amount ? price.unit_amount / 100 : null;
        
        // Calculate period end from billing_cycle_anchor and interval
        // In newer Stripe API versions, we may need to calculate this
        let currentPeriodEnd: string | null = null;
        
        // Try to get from subscription object (may vary by API version)
        const rawSub = stripeSubscription as unknown as Record<string, unknown>;
        const periodEnd = rawSub.current_period_end as number | undefined;
        
        if (periodEnd) {
          currentPeriodEnd = new Date(periodEnd * 1000).toISOString();
        } else if (stripeSubscription.billing_cycle_anchor && interval) {
          // Calculate next period end from billing anchor
          const anchor = new Date(stripeSubscription.billing_cycle_anchor * 1000);
          const now = new Date();
          
          // Find the next billing date after now
          let nextBilling = new Date(anchor);
          while (nextBilling <= now) {
            if (interval === "month") {
              nextBilling.setMonth(nextBilling.getMonth() + 1);
            } else if (interval === "year") {
              nextBilling.setFullYear(nextBilling.getFullYear() + 1);
            }
          }
          currentPeriodEnd = nextBilling.toISOString();
        }
        
        // If we still don't have period end, try to get from latest invoice
        if (!currentPeriodEnd && stripeSubscription.latest_invoice) {
          try {
            const invoiceId = typeof stripeSubscription.latest_invoice === "string" 
              ? stripeSubscription.latest_invoice 
              : stripeSubscription.latest_invoice.id;
            const invoice = await stripe.invoices.retrieve(invoiceId);
            if (invoice.lines.data[0]?.period?.end) {
              currentPeriodEnd = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
            }
          } catch (invoiceErr) {
            console.log("[Settings] Could not fetch invoice for period end:", invoiceErr);
          }
        }
        
        subscription = {
          tier,
          status,
          currentPeriodEnd,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          interval,
          amount,
        };
        
        // Sync tier to database if different
        if (tier !== user.subscriptionTier) {
          await prisma.user.update({
            where: { email: user.email },
            data: { subscriptionTier: tier },
          }).catch(() => {}); // Ignore sync errors
        }
      } catch (err) {
        // Subscription doesn't exist or error - user is on free tier
        console.log("[Settings] Could not fetch subscription:", err);
        subscription.tier = "free";
        subscription.status = "none";
        
        // Clear stale subscription ID
        await prisma.user.update({
          where: { email: user.email },
          data: { 
            subscriptionTier: "free",
            stripeSubscriptionId: null,
            subscriptionEndsAt: null,
          },
        }).catch(() => {});
      }
    }
    
    return NextResponse.json({
      email: user.email,
      subscription,
    });
  } catch (error) {
    console.error("Settings error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
