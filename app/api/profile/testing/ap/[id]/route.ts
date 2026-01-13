import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * PUT /api/profile/testing/ap/[id]
 * Update an AP score
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile();
    const { id } = await params;
    const body = await request.json();

    const apScore = await prisma.aPScore.update({
      where: { id },
      data: {
        subject: body.subject,
        score: parseInt(body.score),
        year: body.year ? parseInt(body.year) : undefined,
      },
    });

    return NextResponse.json(apScore);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error updating AP score:", error);
    return NextResponse.json({ error: "Failed to update AP score" }, { status: 500 });
  }
}

/**
 * DELETE /api/profile/testing/ap/[id]
 * Delete an AP score
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireProfile();
    const { id } = await params;

    await prisma.aPScore.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error deleting AP score:", error);
    return NextResponse.json({ error: "Failed to delete AP score" }, { status: 500 });
  }
}
