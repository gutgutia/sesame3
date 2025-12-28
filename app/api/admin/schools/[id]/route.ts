import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/schools/[id]
 * Get school details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const school = await prisma.school.findUnique({
      where: { id },
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
    return NextResponse.json({ error: "Failed to fetch school" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/schools/[id]
 * Update school details
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const school = await prisma.school.update({
      where: { id },
      data: {
        shortName: body.shortName,
        website: body.website,
        acceptanceRate: body.acceptanceRate,
        deadlineEd: body.deadlineEd ? new Date(body.deadlineEd) : null,
        deadlineEd2: body.deadlineEd2 ? new Date(body.deadlineEd2) : null,
        deadlineEa: body.deadlineEa ? new Date(body.deadlineEa) : null,
        deadlineRea: body.deadlineRea ? new Date(body.deadlineRea) : null,
        deadlineRd: body.deadlineRd ? new Date(body.deadlineRd) : null,
        deadlineFinancialAid: body.deadlineFinancialAid ? new Date(body.deadlineFinancialAid) : null,
        deadlineCommitment: body.deadlineCommitment ? new Date(body.deadlineCommitment) : null,
        notificationEd: body.notificationEd ? new Date(body.notificationEd) : null,
        notificationEa: body.notificationEa ? new Date(body.notificationEa) : null,
        notificationRd: body.notificationRd ? new Date(body.notificationRd) : null,
      },
    });

    return NextResponse.json(school);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Schools] Error updating school:", error);
    return NextResponse.json({ error: "Failed to update school" }, { status: 500 });
  }
}
