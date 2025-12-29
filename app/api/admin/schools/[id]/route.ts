import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface DeadlineYearInput {
  id: string | null;
  admissionsCycle: number;
  deadlineEd: string | null;
  deadlineEd2: string | null;
  deadlineEa: string | null;
  deadlineRd: string | null;
  deadlinePriority: string | null;
  deadlineFinancialAid: string | null;
  dataSource: string;
  dataConfidence: string;
}

/**
 * GET /api/admin/schools/[id]
 * Get school details with deadline years
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        deadlineYears: {
          orderBy: { admissionsCycle: "desc" },
        },
      },
    });

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    return NextResponse.json(school);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Schools] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch school" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/schools/[id]
 * Update school details and deadline years
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    // Update school fields (excluding College Scorecard data which is read-only)
    const school = await prisma.school.update({
      where: { id },
      data: {
        websiteUrl: body.websiteUrl,
        hasEarlyDecision: body.hasEarlyDecision ?? false,
        hasEarlyDecisionII: body.hasEarlyDecisionII ?? false,
        hasEarlyAction: body.hasEarlyAction ?? false,
        isRestrictiveEarlyAction: body.isRestrictiveEarlyAction ?? false,
        hasRollingAdmissions: body.hasRollingAdmissions ?? false,
        admissionsNotes: body.admissionsNotes,
        notes: body.notes,
        lastUpdated: new Date(),
      },
    });

    // Handle deadline years if provided
    if (body.deadlineYears && Array.isArray(body.deadlineYears)) {
      const deadlineYears = body.deadlineYears as DeadlineYearInput[];

      // Get existing deadline years for this school
      const existingYears = await prisma.schoolDeadlineYear.findMany({
        where: { schoolId: id },
      });

      const existingCycles = new Set(existingYears.map((y) => y.admissionsCycle));
      const incomingCycles = new Set(deadlineYears.map((y) => y.admissionsCycle));

      // Delete removed years
      const cyclesToDelete = [...existingCycles].filter(
        (c) => !incomingCycles.has(c)
      );
      if (cyclesToDelete.length > 0) {
        await prisma.schoolDeadlineYear.deleteMany({
          where: {
            schoolId: id,
            admissionsCycle: { in: cyclesToDelete },
          },
        });
      }

      // Upsert each deadline year
      for (const dy of deadlineYears) {
        await prisma.schoolDeadlineYear.upsert({
          where: {
            schoolId_admissionsCycle: {
              schoolId: id,
              admissionsCycle: dy.admissionsCycle,
            },
          },
          create: {
            schoolId: id,
            admissionsCycle: dy.admissionsCycle,
            deadlineEd: dy.deadlineEd ? new Date(dy.deadlineEd) : null,
            deadlineEd2: dy.deadlineEd2 ? new Date(dy.deadlineEd2) : null,
            deadlineEa: dy.deadlineEa ? new Date(dy.deadlineEa) : null,
            deadlineRd: dy.deadlineRd ? new Date(dy.deadlineRd) : null,
            deadlinePriority: dy.deadlinePriority
              ? new Date(dy.deadlinePriority)
              : null,
            deadlineFinancialAid: dy.deadlineFinancialAid
              ? new Date(dy.deadlineFinancialAid)
              : null,
            dataSource: dy.dataSource || "manual",
            dataConfidence: dy.dataConfidence || "low",
            lastVerified: new Date(),
            verifiedById: admin.id,
          },
          update: {
            deadlineEd: dy.deadlineEd ? new Date(dy.deadlineEd) : null,
            deadlineEd2: dy.deadlineEd2 ? new Date(dy.deadlineEd2) : null,
            deadlineEa: dy.deadlineEa ? new Date(dy.deadlineEa) : null,
            deadlineRd: dy.deadlineRd ? new Date(dy.deadlineRd) : null,
            deadlinePriority: dy.deadlinePriority
              ? new Date(dy.deadlinePriority)
              : null,
            deadlineFinancialAid: dy.deadlineFinancialAid
              ? new Date(dy.deadlineFinancialAid)
              : null,
            dataSource: dy.dataSource || "manual",
            dataConfidence: dy.dataConfidence || "low",
            lastVerified: new Date(),
            verifiedById: admin.id,
          },
        });
      }
    }

    // Return updated school with deadline years
    const updatedSchool = await prisma.school.findUnique({
      where: { id },
      include: {
        deadlineYears: {
          orderBy: { admissionsCycle: "desc" },
        },
      },
    });

    return NextResponse.json(updatedSchool);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Schools] Error updating school:", error);
    return NextResponse.json(
      { error: "Failed to update school" },
      { status: 500 }
    );
  }
}
