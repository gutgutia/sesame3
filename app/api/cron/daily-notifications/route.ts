/**
 * POST /api/cron/daily-notifications
 *
 * Daily cron job to send proactive notifications to students.
 * Runs once per day (configured via Vercel cron or external scheduler).
 *
 * This endpoint processes all active students and uses the LLM-based
 * notification engine to decide what notifications to send.
 *
 * Security: Requires CRON_SECRET header to prevent unauthorized access.
 */

import { NextRequest, NextResponse } from "next/server";
import { runDailyNotificationBatch } from "@/lib/notifications";

// Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

export const maxDuration = 300; // 5 minutes max for batch processing

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    // In development, allow requests without secret
    const isDev = process.env.NODE_ENV === "development";

    if (!isDev && CRON_SECRET && providedSecret !== CRON_SECRET) {
      console.error("[Cron] Unauthorized request to daily-notifications");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting daily notification batch...");

    // Run the batch
    const result = await runDailyNotificationBatch();

    console.log(
      `[Cron] Daily notifications complete in ${Date.now() - startTime}ms`
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Cron] Daily notifications failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        processingTimeMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing via browser
export async function GET(request: NextRequest) {
  // Only allow GET in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "GET not allowed in production. Use POST with CRON_SECRET." },
      { status: 405 }
    );
  }

  return POST(request);
}
