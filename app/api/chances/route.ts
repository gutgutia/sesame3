// =============================================================================
// CHANCES API ENDPOINT
// =============================================================================

/**
 * POST /api/chances
 * Calculate admission chances for a student at a specific school.
 *
 * Uses "trajectory" mode by default - includes actual achievements AND
 * in-progress goals to give a realistic assessment of where the student
 * is headed.
 *
 * FREE TIER LIMIT: Free users can only calculate chances for 3 schools
 * at a time. The limit is based on schools currently on their list that
 * have chances calculated.
 *
 * Body:
 * {
 *   schoolId: string,
 *   useLLM?: boolean,        // Default: true
 *   useQuantitative?: boolean // Default: true
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { calculateChances } from "@/lib/chances";
import { prisma } from "@/lib/db";
import { FREE_TIER_LIMITS } from "@/lib/subscription/plans";

export const maxDuration = 60; // Allow up to 60 seconds for LLM processing

export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();

    const { schoolId, useLLM = true, useQuantitative = true } = body;

    if (!schoolId) {
      return NextResponse.json(
        { error: "schoolId is required" },
        { status: 400 }
      );
    }

    // Get user's subscription tier
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        user: {
          select: { subscriptionTier: true },
        },
      },
    });

    const tier = profile?.user.subscriptionTier || "free";

    // Free tier: Check if user has hit their 3-school limit
    if (tier === "free") {
      // Count schools on their list that have chances calculated
      const schoolsWithChances = await prisma.studentSchool.count({
        where: {
          studentProfileId: profileId,
          calculatedChance: { not: null },
        },
      });

      // Check if this school already has chances calculated (allow recalculation)
      const existingSchool = await prisma.studentSchool.findFirst({
        where: {
          studentProfileId: profileId,
          schoolId: schoolId,
          calculatedChance: { not: null },
        },
      });

      // If this is a new school and we're at the limit, block
      if (!existingSchool && schoolsWithChances >= FREE_TIER_LIMITS.schoolsWithChances) {
        return NextResponse.json(
          {
            error: "free_tier_limit",
            message: `Free accounts can check chances for up to ${FREE_TIER_LIMITS.schoolsWithChances} schools. Upgrade to Premium for unlimited chances calculations.`,
            limit: FREE_TIER_LIMITS.schoolsWithChances,
            current: schoolsWithChances,
          },
          { status: 403 }
        );
      }
    }

    // Calculate chances (always uses trajectory mode internally)
    const result = await calculateChances(profileId, schoolId, {
      useLLM,
      useQuantitative,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chances calculation error:", error);

    if (error instanceof Error) {
      if (error.message === "Profile not found") {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }
      if (error.message === "School not found") {
        return NextResponse.json(
          { error: "School not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to calculate chances" },
      { status: 500 }
    );
  }
}
