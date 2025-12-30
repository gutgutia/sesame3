import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import {
  dismissRecommendation,
  saveRecommendation,
  markRecommendationActedUpon,
} from "@/lib/recommendations";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/recommendations/[id]
 * Update a recommendation's status (dismiss, save, mark as acted upon)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const profileId = await getCurrentProfileId();
    const { id } = await params;

    if (!profileId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Verify the recommendation belongs to this profile
    const recommendation = await prisma.recommendation.findUnique({
      where: { id },
      select: { studentProfileId: true },
    });

    if (!recommendation) {
      return NextResponse.json(
        { error: "Recommendation not found" },
        { status: 404 }
      );
    }

    if (recommendation.studentProfileId !== profileId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, feedback } = body;

    let result;
    switch (action) {
      case "dismiss":
        result = await dismissRecommendation(id, feedback);
        break;
      case "save":
        result = await saveRecommendation(id);
        break;
      case "acted_upon":
        result = await markRecommendationActedUpon(id);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating recommendation:", error);
    return NextResponse.json(
      { error: "Failed to update recommendation" },
      { status: 500 }
    );
  }
}
