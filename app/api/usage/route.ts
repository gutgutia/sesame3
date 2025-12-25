// =============================================================================
// USAGE API
// =============================================================================

import { NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { checkUsage, getUserIdFromProfile } from "@/lib/usage";

/**
 * GET /api/usage
 * Get current user's usage stats
 */
export async function GET() {
  try {
    const profileId = await requireProfile();
    const userId = await getUserIdFromProfile(profileId);
    
    if (!userId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    
    const usageCheck = await checkUsage(userId);
    
    return NextResponse.json(usageCheck.usage);
  } catch (error) {
    console.error("Usage error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

