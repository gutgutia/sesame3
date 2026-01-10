import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/programs
 * Get all programs for the current user (from StudentSummerProgram)
 */
export async function GET() {
  try {
    const profileId = await requireProfile();

    const programs = await prisma.studentSummerProgram.findMany({
      where: { studentProfileId: profileId },
      include: {
        summerProgram: {
          select: {
            id: true,
            name: true,
            organization: true,
            category: true,
            focusAreas: true,
          },
        },
      },
      orderBy: [
        { applicationYear: "desc" },
        { displayOrder: "asc" },
      ],
    });

    // Transform to a consistent format for the frontend
    const transformed = programs.map((p) => ({
      id: p.id,
      name: p.isCustom ? p.customName : p.summerProgram?.name,
      organization: p.isCustom ? p.customOrganization : p.summerProgram?.organization,
      description: p.isCustom ? p.customDescription : null,
      status: p.status,
      year: p.applicationYear,
      notes: p.notes,
      whyInterested: p.whyInterested,
      outcome: p.outcome,
      // Metadata
      isCustom: p.isCustom,
      summerProgramId: p.summerProgramId,
      summerProgram: p.summerProgram,
      displayOrder: p.displayOrder,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching programs:", error);
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  }
}

/**
 * POST /api/profile/programs
 * Create a new program (as StudentSummerProgram)
 *
 * For custom programs: { name, organization, description, status, year, ... }
 * For linked programs: { summerProgramId, status, year, ... }
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();

    // Determine if this is a custom program or linked to our database
    const isCustom = !body.summerProgramId;
    const applicationYear = body.year || new Date().getFullYear();

    // Get next display order
    const lastProgram = await prisma.studentSummerProgram.findFirst({
      where: { studentProfileId: profileId },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    const nextOrder = (lastProgram?.displayOrder ?? -1) + 1;

    const program = await prisma.studentSummerProgram.create({
      data: {
        studentProfileId: profileId,
        // Linked program (if provided)
        summerProgramId: body.summerProgramId || null,
        // Custom program fields
        isCustom,
        customName: isCustom ? body.name : null,
        customOrganization: isCustom ? body.organization : null,
        customDescription: isCustom ? body.description : null,
        // Common fields
        applicationYear,
        status: body.status || "interested",
        notes: body.notes,
        whyInterested: body.whyInterested,
        outcome: body.outcome,
        displayOrder: nextOrder,
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

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error creating program:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}
