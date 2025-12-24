import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/about-me
 * Get the current user's AboutMe section
 */
export async function GET() {
  try {
    const profileId = await requireProfile();
    
    const aboutMe = await prisma.aboutMe.findUnique({
      where: { studentProfileId: profileId },
    });
    
    return NextResponse.json(aboutMe || {});
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching aboutMe:", error);
    return NextResponse.json({ error: "Failed to fetch aboutMe" }, { status: 500 });
  }
}

/**
 * PUT /api/profile/about-me
 * Update or create the AboutMe section
 */
export async function PUT(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();
    
    const aboutMe = await prisma.aboutMe.upsert({
      where: { studentProfileId: profileId },
      update: {
        values: body.values || [],
        interests: body.interests || [],
        personality: body.personality,
        background: body.background,
        aspirations: body.aspirations,
      },
      create: {
        studentProfileId: profileId,
        values: body.values || [],
        interests: body.interests || [],
        personality: body.personality,
        background: body.background,
        aspirations: body.aspirations,
      },
    });
    
    return NextResponse.json(aboutMe);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error updating aboutMe:", error);
    return NextResponse.json({ error: "Failed to update aboutMe" }, { status: 500 });
  }
}
