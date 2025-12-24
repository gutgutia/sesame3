import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * PUT /api/profile/courses/[id]
 * Update a course
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile();
    const { id } = await params;
    const body = await request.json();
    
    const course = await prisma.course.update({
      where: { id },
      data: {
        name: body.name,
        subject: body.subject,
        level: body.level,
        status: body.status,
        gradeLevel: body.gradeLevel,
        grade: body.grade,
        gradeNumeric: body.gradeNumeric,
        credits: body.credits,
      },
    });
    
    return NextResponse.json(course);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error updating course:", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

/**
 * DELETE /api/profile/courses/[id]
 * Delete a course
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile();
    const { id } = await params;
    
    // Use deleteMany to avoid error if record doesn't exist (idempotent delete)
    await prisma.course.deleteMany({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error deleting course:", error);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
