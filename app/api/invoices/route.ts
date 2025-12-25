// =============================================================================
// INVOICES API
// =============================================================================
// Returns billing history for the current user

import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-04-30.basil" })
  : null;

/**
 * GET /api/invoices
 * 
 * Get billing history (invoices) for the current user
 */
export async function GET() {
  try {
    if (!stripe) {
      return NextResponse.json({ invoices: [] });
    }
    
    const profileId = await requireProfile();
    
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        user: {
          select: {
            stripeCustomerId: true,
          },
        },
      },
    });
    
    if (!profile?.user.stripeCustomerId) {
      return NextResponse.json({ invoices: [] });
    }
    
    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: profile.user.stripeCustomerId,
      limit: 12, // Last 12 invoices
    });
    
    // Format for frontend
    const formattedInvoices = invoices.data.map(invoice => ({
      id: invoice.id,
      date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      amount: (invoice.amount_paid || 0) / 100,
      currency: invoice.currency,
      status: invoice.status,
      description: invoice.lines.data[0]?.description || "Subscription",
      invoiceUrl: invoice.hosted_invoice_url,
      pdfUrl: invoice.invoice_pdf,
    }));
    
    return NextResponse.json({ invoices: formattedInvoices });
  } catch (error) {
    console.error("Invoices error:", error);
    return NextResponse.json({ invoices: [] });
  }
}

