import { NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import {
  generateRecommendations,
  getRecommendations,
  getStudentStage,
} from "@/lib/recommendations";
import { prisma } from "@/lib/db";

/**
 * Helper to check if user has paid subscription
 */
async function checkPaidAccess(profileId: string): Promise<{
  isPaid: boolean;
  tier: string;
}> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: {
      user: {
        select: { subscriptionTier: true },
      },
    },
  });

  const tier = profile?.user.subscriptionTier || "free";
  return { isPaid: tier === "paid", tier };
}

/**
 * GET /api/recommendations
 * Get the current user's recommendations
 *
 * PAID FEATURE: Personalized recommendations require a paid subscription.
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

    // Check subscription tier
    const { isPaid } = await checkPaidAccess(profileId);

    if (!isPaid) {
      return NextResponse.json(
        {
          error: "paid_feature",
          message:
            "Personalized recommendations are a Premium feature. Upgrade to get AI-powered school and program recommendations tailored to your profile.",
          feature: "recommendations",
        },
        { status: 403 }
      );
    }

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

    return NextResponse.json({
      recommendations,
      stage,
      lastGenerated: recommendations[0]?.generatedAt ?? null,
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
 * PAID FEATURE: Personalized recommendations require a paid subscription.
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
    const { isPaid } = await checkPaidAccess(profileId);

    if (!isPaid) {
      return NextResponse.json(
        {
          error: "paid_feature",
          message:
            "Personalized recommendations are a Premium feature. Upgrade to get AI-powered school and program recommendations tailored to your profile.",
          feature: "recommendations",
        },
        { status: 403 }
      );
    }

    // Generate new recommendations
    const result = await generateRecommendations(profileId);

    // Fetch the saved recommendations (with IDs) from database
    const savedRecommendations = await getRecommendations(profileId);

    return NextResponse.json({
      success: true,
      recommendations: savedRecommendations,
      stage: result.stage,
      savedCount: result.savedCount,
    });
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
