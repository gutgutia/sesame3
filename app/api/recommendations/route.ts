import { NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import {
  generateRecommendations,
  getRecommendations,
  getStudentStage,
} from "@/lib/recommendations";
import { prisma } from "@/lib/db";
import {
  getCachedRecommendations,
  setCachedRecommendations,
  invalidateRecommendationsCache,
} from "@/lib/cache/recommendations-cache";

/**
 * Helper to check subscription tier
 */
async function getSubscriptionTier(profileId: string): Promise<string> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: {
      user: {
        select: { subscriptionTier: true },
      },
    },
  });

  return profile?.user.subscriptionTier || "free";
}

/**
 * Check if free user has already generated recommendations this month
 */
async function hasGeneratedThisMonth(profileId: string): Promise<{
  hasGenerated: boolean;
  lastGeneratedAt: Date | null;
  resetDate: Date;
}> {
  // Get the start of the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get the start of next month (reset date)
  const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  // Check if any recommendation was generated this month
  const recentRecommendation = await prisma.recommendation.findFirst({
    where: {
      studentProfileId: profileId,
      generatedAt: { gte: startOfMonth },
    },
    orderBy: { generatedAt: "desc" },
    select: { generatedAt: true },
  });

  return {
    hasGenerated: !!recentRecommendation,
    lastGeneratedAt: recentRecommendation?.generatedAt || null,
    resetDate,
  };
}

/**
 * GET /api/recommendations
 * Get the current user's recommendations
 *
 * Free users: Can view existing recommendations, limited to 1 generation/month
 * Paid users: Unlimited access
 */
export async function GET() {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check cache first for fast response
    const cached = getCachedRecommendations(profileId);
    if (cached) {
      // Still need to get fresh tier/usage info (fast queries)
      const tier = await getSubscriptionTier(profileId);
      const isPaid = tier === "paid";

      let usageInfo = null;
      if (!isPaid) {
        const { hasGenerated, resetDate } = await hasGeneratedThisMonth(profileId);
        usageInfo = {
          canGenerate: !hasGenerated,
          hasGeneratedThisMonth: hasGenerated,
          resetDate: resetDate.toISOString(),
          limit: 1,
          used: hasGenerated ? 1 : 0,
        };
      }

      return NextResponse.json({
        ...cached,
        tier,
        usageInfo,
        fromCache: true,
      });
    }

    // Get subscription tier and usage info
    const tier = await getSubscriptionTier(profileId);
    const isPaid = tier === "paid";

    // Get profile for stage calculation
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: { graduationYear: true, grade: true },
    });

    // Get existing recommendations
    const recommendations = await getRecommendations(profileId);

    // Calculate current stage - use stored grade if available
    const stage = getStudentStage(profile?.graduationYear ?? null, {
      grade: profile?.grade,
    });

    const lastGenerated = recommendations[0]?.generatedAt?.toISOString() ?? null;

    // Cache the results
    setCachedRecommendations(profileId, {
      recommendations,
      stage,
      lastGenerated,
    });

    // For free users, include usage limit info
    let usageInfo = null;
    if (!isPaid) {
      const { hasGenerated, resetDate } = await hasGeneratedThisMonth(profileId);
      usageInfo = {
        canGenerate: !hasGenerated,
        hasGeneratedThisMonth: hasGenerated,
        resetDate: resetDate.toISOString(),
        limit: 1,
        used: hasGenerated ? 1 : 0,
      };
    }

    return NextResponse.json({
      recommendations,
      stage,
      lastGenerated,
      tier,
      usageInfo,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recommendations
 * Generate new recommendations for the current user
 *
 * Free users: Limited to 1 generation per month
 * Paid users: Unlimited generations
 */
export async function POST() {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check subscription tier
    const tier = await getSubscriptionTier(profileId);
    const isPaid = tier === "paid";

    // For free users, check monthly limit
    if (!isPaid) {
      const { hasGenerated, resetDate } = await hasGeneratedThisMonth(profileId);

      if (hasGenerated) {
        return NextResponse.json(
          {
            error: "monthly_limit_reached",
            message: "You've used your free recommendation for this month. Upgrade to Premium for unlimited recommendations.",
            feature: "recommendations",
            resetDate: resetDate.toISOString(),
            usageInfo: {
              canGenerate: false,
              hasGeneratedThisMonth: true,
              resetDate: resetDate.toISOString(),
              limit: 1,
              used: 1,
            },
          },
          { status: 403 }
        );
      }
    }

    // Invalidate cache before generating
    invalidateRecommendationsCache(profileId);

    // Generate new recommendations
    const result = await generateRecommendations(profileId);

    // Fetch the saved recommendations (with IDs) from database
    const savedRecommendations = await getRecommendations(profileId);

    // Cache the new results
    setCachedRecommendations(profileId, {
      recommendations: savedRecommendations,
      stage: result.stage,
      lastGenerated: new Date().toISOString(),
    });

    // Return usage info for free users
    let usageInfo = null;
    if (!isPaid) {
      const { resetDate } = await hasGeneratedThisMonth(profileId);
      usageInfo = {
        canGenerate: false, // Just used their generation
        hasGeneratedThisMonth: true,
        resetDate: resetDate.toISOString(),
        limit: 1,
        used: 1,
      };
    }

    return NextResponse.json({
      success: true,
      recommendations: savedRecommendations,
      stage: result.stage,
      savedCount: result.savedCount,
      tier,
      usageInfo,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
