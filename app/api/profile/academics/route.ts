import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/academics
 * Get the current user's academics section
 */
export async function GET() {
  try {
    const profileId = await requireProfile();
    
    const academics = await prisma.academics.findUnique({
      where: { studentProfileId: profileId },
    });
    
    return NextResponse.json(academics || {});
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching academics:", error);
    return NextResponse.json({ error: "Failed to fetch academics" }, { status: 500 });
  }
}

/**
 * PUT /api/profile/academics
 * Update or create the academics section
 */
export async function PUT(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();
    
    const academics = await prisma.academics.upsert({
      where: { studentProfileId: profileId },
      update: {
        schoolReportedGpaUnweighted: body.gpaUnweighted,
        schoolReportedGpaWeighted: body.gpaWeighted,
        gpaScale: body.gpaScale,
        classRank: body.classRank,
        classSize: body.classSize,
        transcriptUrl: body.transcriptUrl,
      },
      create: {
        studentProfileId: profileId,
        schoolReportedGpaUnweighted: body.gpaUnweighted,
        schoolReportedGpaWeighted: body.gpaWeighted,
        gpaScale: body.gpaScale,
        classRank: body.classRank,
        classSize: body.classSize,
        transcriptUrl: body.transcriptUrl,
      },
    });
    
    return NextResponse.json(academics);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error updating academics:", error);
    return NextResponse.json({ error: "Failed to update academics" }, { status: 500 });
  }
}
