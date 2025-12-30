/**
 * POST /api/context/warmup
 *
 * Pre-assembles advisor context and caches it for fast chat startup.
 * Called immediately after login to eliminate cold-start latency.
 *
 * This is a fire-and-forget endpoint - client doesn't need to wait for response.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import { assembleContext, type EntryMode } from "@/lib/ai";
import { setCachedContext, getCachedContext } from "@/lib/cache/context-cache";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const profileId = await getCurrentProfileId();
    if (!profileId) {
      return NextResponse.json({ warmed: false, reason: "no_profile" });
    }

    // Check if already cached
    const existing = getCachedContext(profileId);
    if (existing) {
      console.log(`[Warmup] Context already cached for ${profileId}`);
      return NextResponse.json({ warmed: true, cached: true, ms: 0 });
    }

    // Parse optional mode from request
    let mode: EntryMode = "general";
    try {
      const body = await request.json();
      mode = body.mode || "general";
    } catch {
      // No body or invalid JSON, use default
    }

    // Assemble context (this is the expensive operation we're pre-computing)
    const context = await assembleContext({
      profileId,
      mode,
      messages: [],
      sessionStartTime: new Date(),
    });

    // Cache it
    setCachedContext(profileId, context);

    const elapsed = Date.now() - startTime;
    console.log(`[Warmup] Context assembled and cached in ${elapsed}ms for ${profileId}`);

    return NextResponse.json({ warmed: true, cached: false, ms: elapsed });
  } catch (error) {
    console.error("[Warmup] Error:", error);
    return NextResponse.json({ warmed: false, error: "failed" }, { status: 500 });
  }
}
