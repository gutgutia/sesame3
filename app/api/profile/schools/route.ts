import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/schools
 * Get student's school list
 */
export async function GET() {
  try {
    const profileId = await requireProfile();
    
    const schools = await prisma.studentSchool.findMany({
      where: { studentProfileId: profileId },
      include: { school: true },
      orderBy: { displayOrder: "asc" },
    });
    
    return NextResponse.json(schools);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching schools:", error);
    return NextResponse.json({ error: "Failed to fetch schools" }, { status: 500 });
  }
}

/**
 * POST /api/profile/schools
 * Add a school to the student's list
 *
 * Body for linked school (from our database):
 *   - schoolId: ID of school from global database
 *   - tier: "reach" | "target" | "safety"
 *   - isDream?: boolean
 *   - interestLevel?: "high" | "medium" | "low" | "uncertain"
 *   - applicationType?: "ed" | "ed2" | "ea" | "rea" | "rd"
 *   - whyInterested?: string
 *
 * Body for custom school (not in our database):
 *   - customName: Name of the school (e.g., "XYZ University")
 *   - customLocation?: Location (e.g., "California")
 *   - tier: "reach" | "target" | "safety"
 *   - ...other fields
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();

    const { schoolId, customName, customLocation, tier, isDream, interestLevel, applicationType, whyInterested } = body;

    // Must have either schoolId (linked) or customName (custom)
    if (!schoolId && !customName) {
      return NextResponse.json(
        { error: "Either schoolId or customName is required" },
        { status: 400 }
      );
    }

    // Get next display order
    const lastSchool = await prisma.studentSchool.findFirst({
      where: { studentProfileId: profileId },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    const nextOrder = (lastSchool?.displayOrder ?? -1) + 1;

    if (schoolId) {
      // Adding a linked school from our database

      // Check if already on list
      const existing = await prisma.studentSchool.findFirst({
        where: {
          studentProfileId: profileId,
          schoolId,
        },
      });

      if (existing) {
        // Update existing
        const updated = await prisma.studentSchool.update({
          where: { id: existing.id },
          data: {
            tier: tier ?? existing.tier,
            isDream: isDream ?? existing.isDream,
            interestLevel: interestLevel ?? existing.interestLevel,
            applicationType: applicationType ?? existing.applicationType,
            whyInterested: whyInterested ?? existing.whyInterested,
          },
          include: { school: true },
        });
        return NextResponse.json(updated);
      }

      // Create new linked entry
      const studentSchool = await prisma.studentSchool.create({
        data: {
          studentProfileId: profileId,
          schoolId,
          isCustom: false,
          tier: tier || "reach",
          isDream: isDream || false,
          interestLevel,
          applicationType,
          whyInterested,
          displayOrder: nextOrder,
        },
        include: { school: true },
      });

      return NextResponse.json(studentSchool, { status: 201 });
    } else {
      // Adding a custom school (not in our database)

      // Check if custom school with same name already on list
      const existing = await prisma.studentSchool.findFirst({
        where: {
          studentProfileId: profileId,
          isCustom: true,
          customName: { equals: customName, mode: "insensitive" },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "This school is already on your list" },
          { status: 400 }
        );
      }

      // Create new custom entry
      const studentSchool = await prisma.studentSchool.create({
        data: {
          studentProfileId: profileId,
          schoolId: null,
          isCustom: true,
          customName,
          customLocation,
          tier: tier || "reach",
          isDream: isDream || false,
          interestLevel,
          applicationType,
          whyInterested,
          displayOrder: nextOrder,
        },
      });

      return NextResponse.json(studentSchool, { status: 201 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error adding school:", error);
    return NextResponse.json({ error: "Failed to add school" }, { status: 500 });
  }
}
