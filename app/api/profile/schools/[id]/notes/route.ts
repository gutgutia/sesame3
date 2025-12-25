import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/schools/[id]/notes
 * Get all notes for a school
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id } = await params;
    
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
    
    const notes = await prisma.schoolNote.findMany({
      where: { studentSchoolId: id },
      orderBy: { createdAt: "desc" },
    });
    
    return NextResponse.json(notes);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching notes:", error);
    return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

/**
 * POST /api/profile/schools/[id]/notes
 * Create a new note for a school
 * 
 * Body:
 *   - title?: string
 *   - content: JSON (TipTap/Novel format)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profileId = await requireProfile();
    const { id } = await params;
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
    
    if (!body.content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    
    const note = await prisma.schoolNote.create({
      data: {
        studentSchoolId: id,
        title: body.title || null,
        content: body.content,
      },
    });
    
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error creating note:", error);
    return NextResponse.json({ error: "Failed to create note" }, { status: 500 });
  }
}

