import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/testing/ap
 * Get all AP scores for the current user
 */
export async function GET() {
  try {
    const profileId = await requireProfile();

    // Get or create Testing container
    const testing = await prisma.testing.upsert({
      where: { studentProfileId: profileId },
      create: { studentProfileId: profileId },
      update: {},
      include: { apScores: { orderBy: { year: "desc" } } },
    });

    return NextResponse.json(testing.apScores);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching AP scores:", error);
    return NextResponse.json({ error: "Failed to fetch AP scores" }, { status: 500 });
  }
}

/**
 * POST /api/profile/testing/ap
 * Add a new AP score
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();

    // Validate required fields
    if (!body.subject) {
      return NextResponse.json(
        { error: "Subject is required" },
        { status: 400 }
      );
    }

    if (!body.score || body.score < 1 || body.score > 5) {
      return NextResponse.json(
        { error: "Score must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Get or create Testing container
    const testing = await prisma.testing.upsert({
      where: { studentProfileId: profileId },
      create: { studentProfileId: profileId },
      update: {},
    });

    const apScore = await prisma.aPScore.create({
      data: {
        testingId: testing.id,
        subject: body.subject,
        score: parseInt(body.score),
        year: body.year ? parseInt(body.year) : new Date().getFullYear(),
      },
    });

    return NextResponse.json(apScore, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error creating AP score:", error);
    return NextResponse.json(
      { error: "Failed to create AP score", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
