// =============================================================================
// SETTINGS API
// =============================================================================

import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-12-15.clover" })
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
            accountType: true,
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
    
    // Default subscription state (two-tier system: free and paid)
    let subscription = {
      tier: user.subscriptionTier as "free" | "paid",
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
        
        // Determine tier from price (two-tier system: free and paid)
        // All paid price IDs map to "paid" tier
        let tier: "free" | "paid" = "free";

        const paidPriceIds = [
          process.env.STRIPE_PRICE_PAID_MONTHLY,
          process.env.STRIPE_PRICE_PAID_YEARLY,
          // Legacy price IDs for backwards compatibility
          process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
          process.env.STRIPE_PRICE_PREMIUM_YEARLY,
          process.env.STRIPE_PRICE_STANDARD_MONTHLY,
          process.env.STRIPE_PRICE_STANDARD_YEARLY,
        ].filter(Boolean);

        if (paidPriceIds.includes(priceId)) {
          tier = "paid";
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
      accountType: user.accountType || "student",
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

/**
 * PUT /api/settings
 * Update user settings (accountType)
 */
export async function PUT(request: Request) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();

    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Validate accountType
    const validAccountTypes = ["student", "parent", "counselor"];
    if (body.accountType && !validAccountTypes.includes(body.accountType)) {
      return NextResponse.json(
        { error: "Invalid account type. Must be 'student', 'parent', or 'counselor'" },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: profile.userId },
      data: {
        ...(body.accountType && { accountType: body.accountType }),
      },
      select: {
        email: true,
        accountType: true,
      },
    });

    return NextResponse.json({
      email: updatedUser.email,
      accountType: updatedUser.accountType,
    });
  } catch (error) {
    console.error("Settings update error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
