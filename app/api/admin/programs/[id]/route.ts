import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface SessionInput {
  id: string | null;
  name: string;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
}

/**
 * GET /api/admin/programs/[id]
 * Get program details with sessions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const program = await prisma.summerProgram.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { startDate: "asc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    return NextResponse.json(program);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Programs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch program" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/programs/[id]
 * Update program details and sessions
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    // Update program fields
    const program = await prisma.summerProgram.update({
      where: { id },
      data: {
        name: body.name,
        shortName: body.shortName,
        organization: body.organization,
        description: body.description,
        websiteUrl: body.websiteUrl,
        programYear: body.programYear,
        // Eligibility
        minGrade: body.minGrade,
        maxGrade: body.maxGrade,
        minAge: body.minAge,
        maxAge: body.maxAge,
        minGpaUnweighted: body.minGpaUnweighted,
        minGpaWeighted: body.minGpaWeighted,
        citizenship: body.citizenship,
        requiredCourses: body.requiredCourses || [],
        recommendedCourses: body.recommendedCourses || [],
        eligibilityNotes: body.eligibilityNotes,
        // Application
        applicationOpens: body.applicationOpens ? new Date(body.applicationOpens) : null,
        applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null,
        isRolling: body.isRolling ?? false,
        rollingNotes: body.rollingNotes,
        applicationUrl: body.applicationUrl,
        applicationNotes: body.applicationNotes,
        // Program Details
        format: body.format,
        location: body.location,
        // AI Context
        llmContext: body.llmContext,
        // Metadata
        category: body.category,
        focusAreas: body.focusAreas || [],
        isActive: body.isActive ?? true,
        dataSource: body.dataSource,
        dataStatus: body.dataStatus,
        lastVerified: new Date(),
      },
    });

    // Handle sessions if provided
    if (body.sessions && Array.isArray(body.sessions)) {
      const sessions = body.sessions as SessionInput[];

      // Get existing sessions for this program
      const existingSessions = await prisma.summerProgramSession.findMany({
        where: { summerProgramId: id },
      });

      const existingIds = new Set(existingSessions.map((s) => s.id));
      const incomingIds = new Set(
        sessions.filter((s) => s.id).map((s) => s.id as string)
      );

      // Delete removed sessions
      const idsToDelete = [...existingIds].filter((sid) => !incomingIds.has(sid));
      if (idsToDelete.length > 0) {
        await prisma.summerProgramSession.deleteMany({
          where: {
            id: { in: idsToDelete },
          },
        });
      }

      // Upsert each session
      for (const session of sessions) {
        if (!session.startDate || !session.endDate) continue;

        if (session.id) {
          // Update existing session
          await prisma.summerProgramSession.update({
            where: { id: session.id },
            data: {
              name: session.name,
              startDate: new Date(session.startDate),
              endDate: new Date(session.endDate),
              notes: session.notes,
            },
          });
        } else {
          // Create new session
          await prisma.summerProgramSession.create({
            data: {
              summerProgramId: id,
              name: session.name,
              startDate: new Date(session.startDate),
              endDate: new Date(session.endDate),
              notes: session.notes,
            },
          });
        }
      }
    }

    // Return updated program with sessions
    const updatedProgram = await prisma.summerProgram.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { startDate: "asc" },
        },
      },
    });

    return NextResponse.json(updatedProgram);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Programs] Error updating program:", error);
    return NextResponse.json(
      { error: "Failed to update program" },
      { status: 500 }
    );
  }
}
