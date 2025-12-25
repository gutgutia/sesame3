import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/schools/[id]
 * Get a specific school from student's list with all notes
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id } = await params;
    
    const studentSchool = await prisma.studentSchool.findFirst({
      where: { 
        id,
        studentProfileId: profileId,
      },
      include: { 
        school: true,
        richNotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    
    if (!studentSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    return NextResponse.json(studentSchool);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching school:", error);
    return NextResponse.json({ error: "Failed to fetch school" }, { status: 500 });
  }
}

/**
 * PUT /api/profile/schools/[id]
 * Update school list item (tier, status, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id } = await params;
    const body = await request.json();
    
    // Verify ownership
    const existing = await prisma.studentSchool.findFirst({
      where: { 
        id,
        studentProfileId: profileId,
      },
    });
    
    if (!existing) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    const updated = await prisma.studentSchool.update({
      where: { id },
      data: {
        tier: body.tier,
        isDream: body.isDream,
        interestLevel: body.interestLevel,
        status: body.status,
        applicationType: body.applicationType,
        notes: body.notes,
        whyInterested: body.whyInterested,
        concerns: body.concerns,
        calculatedChance: body.calculatedChance,
        chanceUpdatedAt: body.chanceUpdatedAt,
      },
      include: { school: true },
    });
    
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error updating school:", error);
    return NextResponse.json({ error: "Failed to update school" }, { status: 500 });
  }
}

/**
 * DELETE /api/profile/schools/[id]
 * Remove school from student's list
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id } = await params;
    
    // Verify ownership
    const existing = await prisma.studentSchool.findFirst({
      where: { 
        id,
        studentProfileId: profileId,
      },
    });
    
    if (!existing) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    await prisma.studentSchool.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error deleting school:", error);
    return NextResponse.json({ error: "Failed to delete school" }, { status: 500 });
  }
}

