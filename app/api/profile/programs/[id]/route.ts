import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/profile/programs/[id]
 * Update a program (StudentSummerProgram)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const profileId = await requireProfile();
    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.studentSummerProgram.findFirst({
      where: { id, studentProfileId: profileId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Determine if this should be custom
    const isCustom = existing.isCustom || !body.summerProgramId;

    const program = await prisma.studentSummerProgram.update({
      where: { id },
      data: {
        // Custom program fields (only update if custom)
        customName: isCustom ? body.name : existing.customName,
        customOrganization: isCustom ? body.organization : existing.customOrganization,
        customDescription: isCustom ? body.description : existing.customDescription,
        // Common fields
        applicationYear: body.year ?? existing.applicationYear,
        status: body.status ?? existing.status,
        notes: body.notes,
        whyInterested: body.whyInterested,
        outcome: body.outcome,
      },
      include: {
        summerProgram: {
          select: {
            id: true,
            name: true,
            organization: true,
          },
        },
      },
    });

    // Transform response
    const response = {
      id: program.id,
      name: program.isCustom ? program.customName : program.summerProgram?.name,
      organization: program.isCustom ? program.customOrganization : program.summerProgram?.organization,
      description: program.isCustom ? program.customDescription : null,
      status: program.status,
      year: program.applicationYear,
      notes: program.notes,
      whyInterested: program.whyInterested,
      outcome: program.outcome,
      isCustom: program.isCustom,
      summerProgramId: program.summerProgramId,
      summerProgram: program.summerProgram,
      displayOrder: program.displayOrder,
      createdAt: program.createdAt,
      updatedAt: program.updatedAt,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error updating program:", error);
    return NextResponse.json({ error: "Failed to update program" }, { status: 500 });
  }
}

/**
 * DELETE /api/profile/programs/[id]
 * Delete a program (StudentSummerProgram)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const profileId = await requireProfile();
    const { id } = await params;

    // Verify ownership
    const existing = await prisma.studentSummerProgram.findFirst({
      where: { id, studentProfileId: profileId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    await prisma.studentSummerProgram.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error deleting program:", error);
    return NextResponse.json({ error: "Failed to delete program" }, { status: 500 });
  }
}
