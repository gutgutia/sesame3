import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/schools/[id]/notes/[noteId]
 * Get a specific note
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id, noteId } = await params;
    
    // Verify school belongs to student
    const studentSchool = await prisma.studentSchool.findFirst({
      where: { 
        id,
        studentProfileId: profileId,
      },
    });
    
    if (!studentSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    const note = await prisma.schoolNote.findFirst({
      where: { 
        id: noteId,
        studentSchoolId: id,
      },
    });
    
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    
    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching note:", error);
    return NextResponse.json({ error: "Failed to fetch note" }, { status: 500 });
  }
}

/**
 * PUT /api/profile/schools/[id]/notes/[noteId]
 * Update a note
 * 
 * Body:
 *   - title?: string
 *   - content?: JSON (TipTap/Novel format)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id, noteId } = await params;
    const body = await request.json();
    
    // Verify school belongs to student
    const studentSchool = await prisma.studentSchool.findFirst({
      where: { 
        id,
        studentProfileId: profileId,
      },
    });
    
    if (!studentSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    // Verify note exists and belongs to this school
    const existing = await prisma.schoolNote.findFirst({
      where: { 
        id: noteId,
        studentSchoolId: id,
      },
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    
    const note = await prisma.schoolNote.update({
      where: { id: noteId },
      data: {
        title: body.title !== undefined ? body.title : existing.title,
        content: body.content !== undefined ? body.content : existing.content,
      },
    });
    
    return NextResponse.json(note);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error updating note:", error);
    return NextResponse.json({ error: "Failed to update note" }, { status: 500 });
  }
}

/**
 * DELETE /api/profile/schools/[id]/notes/[noteId]
 * Delete a note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id, noteId } = await params;
    
    // Verify school belongs to student
    const studentSchool = await prisma.studentSchool.findFirst({
      where: { 
        id,
        studentProfileId: profileId,
      },
    });
    
    if (!studentSchool) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }
    
    // Verify note exists and belongs to this school
    const existing = await prisma.schoolNote.findFirst({
      where: { 
        id: noteId,
        studentSchoolId: id,
      },
    });
    
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    
    await prisma.schoolNote.delete({ where: { id: noteId } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error deleting note:", error);
    return NextResponse.json({ error: "Failed to delete note" }, { status: 500 });
  }
}

