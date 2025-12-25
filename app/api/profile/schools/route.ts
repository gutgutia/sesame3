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
 * Body:
 *   - schoolId: ID of school from global database (preferred)
 *   - schoolName: Name of school (fallback - will create if not found)
 *   - tier: "reach" | "target" | "safety"
 *   - isDream: boolean
 *   - interestLevel?: "high" | "medium" | "low" | "uncertain"
 *   - applicationType?: "ed" | "ed2" | "ea" | "rea" | "rd"
 *   - whyInterested?: string
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();
    
    let schoolId = body.schoolId;
    
    // If no schoolId, find or create by name
    if (!schoolId && body.schoolName) {
      let school = await prisma.school.findFirst({
        where: { name: { equals: body.schoolName, mode: "insensitive" } },
      });
      
      if (!school) {
        // Create a new school entry (manual fallback)
        school = await prisma.school.create({
          data: { 
            name: body.schoolName,
            dataSource: "manual",
          },
        });
      }
      
      schoolId = school.id;
    }
    
    if (!schoolId) {
      return NextResponse.json(
        { error: "schoolId or schoolName required" },
        { status: 400 }
      );
    }
    
    // Check if already on list
    const existing = await prisma.studentSchool.findUnique({
      where: {
        studentProfileId_schoolId: {
          studentProfileId: profileId,
          schoolId,
        },
      },
    });
    
    if (existing) {
      // Update existing
      const updated = await prisma.studentSchool.update({
        where: { id: existing.id },
        data: {
          tier: body.tier ?? existing.tier,
          isDream: body.isDream ?? existing.isDream,
          interestLevel: body.interestLevel ?? existing.interestLevel,
          applicationType: body.applicationType ?? existing.applicationType,
          whyInterested: body.whyInterested ?? existing.whyInterested,
        },
        include: { school: true },
      });
      return NextResponse.json(updated);
    }
    
    // Get next display order
    const lastSchool = await prisma.studentSchool.findFirst({
      where: { studentProfileId: profileId },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    
    const studentSchool = await prisma.studentSchool.create({
      data: {
        studentProfileId: profileId,
        schoolId,
        tier: body.tier || "reach",
        isDream: body.isDream || false,
        interestLevel: body.interestLevel,
        applicationType: body.applicationType,
        whyInterested: body.whyInterested,
        displayOrder: (lastSchool?.displayOrder ?? -1) + 1,
      },
      include: { school: true },
    });
    
    return NextResponse.json(studentSchool, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error adding school:", error);
    return NextResponse.json({ error: "Failed to add school" }, { status: 500 });
  }
}
