import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

// GET /api/profile/stories/[id] - Get a specific story entry
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile();
    const { id } = await params;

    const storyEntry = await prisma.storyEntry.findUnique({
      where: { id },
    });

    if (!storyEntry) {
      return NextResponse.json(
        { error: "Story not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(storyEntry);
  } catch (error) {
    console.error("Error fetching story:", error);
    return NextResponse.json(
      { error: "Failed to fetch story" },
      { status: 500 }
    );
  }
}

// PUT /api/profile/stories/[id] - Update a story entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile();
    const { id } = await params;
    const body = await request.json();

    const { title, summary, themes } = body;

    const storyEntry = await prisma.storyEntry.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(summary && { summary }),
        ...(themes && { themes }),
      },
    });

    return NextResponse.json(storyEntry);
  } catch (error) {
    console.error("Error updating story:", error);
    return NextResponse.json(
      { error: "Failed to update story" },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/stories/[id] - Delete a story entry
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile();
    const { id } = await params;

    await prisma.storyEntry.deleteMany({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting story:", error);
    return NextResponse.json(
      { error: "Failed to delete story" },
      { status: 500 }
    );
  }
}

