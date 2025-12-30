import { NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import {
  generateRecommendations,
  getRecommendations,
  getStudentStage,
} from "@/lib/recommendations";
import { prisma } from "@/lib/db";

/**
 * GET /api/recommendations
 * Get the current user's recommendations
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

    // Get profile for stage calculation
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: { graduationYear: true },
    });

    // Get existing recommendations
    const recommendations = await getRecommendations(profileId);

    // Calculate current stage
    const stage = getStudentStage(profile?.graduationYear ?? null);

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
