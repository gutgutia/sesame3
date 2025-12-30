import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";

/**
 * GET /api/opportunities/summer-programs
 * Get the current user's tracked summer programs
 */
export async function GET() {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const trackedPrograms = await prisma.studentSummerProgram.findMany({
      where: { studentProfileId: profileId },
      include: {
        summerProgram: true,
      },
      orderBy: [
        { status: "asc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(trackedPrograms);
  } catch (error) {
    console.error("Error fetching tracked programs:", error);
    return NextResponse.json(
      { error: "Failed to fetch tracked programs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opportunities/summer-programs
 * Add a summer program to tracking
 *
 * Body for linked program (from our database):
 *   - summerProgramId: ID of program from our database
 *   - applicationYear?: Year (defaults to program's programYear)
 *   - status?: Tracking status
 *   - notes?: Notes
 *   - whyInterested?: Why interested
 *
 * Body for custom program (not in our database):
 *   - customName: Name of the program
 *   - customOrganization?: Organization name
 *   - customDescription?: Brief description
 *   - applicationYear: Year (required for custom)
 *   - status?: Tracking status
 *   - notes?: Notes
 *   - whyInterested?: Why interested
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      summerProgramId,
      customName,
      customOrganization,
      customDescription,
      applicationYear,
      status = "interested",
      notes,
      whyInterested,
    } = body;

    // Must have either summerProgramId (linked) or customName (custom)
    if (!summerProgramId && !customName) {
      return NextResponse.json(
        { error: "Either summerProgramId or customName is required" },
        { status: 400 }
      );
    }

    if (summerProgramId) {
      // Adding a linked program from our database

      // Get the program to determine the application year if not provided
      const program = await prisma.summerProgram.findUnique({
        where: { id: summerProgramId },
      });

      if (!program) {
        return NextResponse.json(
          { error: "Program not found" },
          { status: 404 }
        );
      }

      const year = applicationYear || program.programYear;

      // Check if already tracking this program for this year
      const existing = await prisma.studentSummerProgram.findFirst({
        where: {
          studentProfileId: profileId,
          summerProgramId,
          applicationYear: year,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Already tracking this program for this year" },
          { status: 409 }
        );
      }

      const tracked = await prisma.studentSummerProgram.create({
        data: {
          studentProfileId: profileId,
          summerProgramId,
          isCustom: false,
          applicationYear: year,
          status,
          notes,
          whyInterested,
        },
        include: {
          summerProgram: true,
        },
      });

      return NextResponse.json(tracked, { status: 201 });
    } else {
      // Adding a custom program (not in our database)

      if (!applicationYear) {
        return NextResponse.json(
          { error: "applicationYear is required for custom programs" },
          { status: 400 }
        );
      }

      // Check if custom program with same name already tracked for this year
      const existing = await prisma.studentSummerProgram.findFirst({
        where: {
          studentProfileId: profileId,
          isCustom: true,
          customName: { equals: customName, mode: "insensitive" },
          applicationYear,
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Already tracking this program for this year" },
          { status: 409 }
        );
      }

      const tracked = await prisma.studentSummerProgram.create({
        data: {
          studentProfileId: profileId,
          summerProgramId: null,
          isCustom: true,
          customName,
          customOrganization,
          customDescription,
          applicationYear,
          status,
          notes,
          whyInterested,
        },
      });

      return NextResponse.json(tracked, { status: 201 });
    }
  } catch (error) {
    console.error("Error adding program to tracking:", error);
    return NextResponse.json(
      { error: "Failed to add program to tracking" },
      { status: 500 }
    );
  }
}
