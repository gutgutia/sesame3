import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

/**
 * GET /api/profile/programs
 * Get all programs for the current user
 */
export async function GET() {
  try {
    const profileId = await requireProfile();
    
    const programs = await prisma.program.findMany({
      where: { studentProfileId: profileId },
      orderBy: { year: "desc" },
    });
    
    return NextResponse.json(programs);
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error fetching programs:", error);
    return NextResponse.json({ error: "Failed to fetch programs" }, { status: 500 });
  }
}

/**
 * Infer program type from name if not provided
 */
function inferProgramType(name: string): string {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("research") || lowerName.includes("sra") || lowerName.includes("simr") || lowerName.includes("rsi")) {
    return "research";
  }
  if (lowerName.includes("intern")) {
    return "internship";
  }
  return "summer"; // Default
}

/**
 * POST /api/profile/programs
 * Create a new program
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();

    // Infer type if not provided
    const programType = body.type || inferProgramType(body.name || "");

    const program = await prisma.program.create({
      data: {
        studentProfileId: profileId,
        name: body.name,
        organization: body.organization,
        type: programType,
        status: body.status || "interested",
        year: body.year,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        duration: body.duration,
        applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : undefined,
        applicationStatus: body.applicationStatus,
        description: body.description,
        selectivity: body.selectivity,
        outcome: body.outcome,
      },
    });
    
    return NextResponse.json(program, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error creating program:", error);
    return NextResponse.json({ error: "Failed to create program" }, { status: 500 });
  }
}
