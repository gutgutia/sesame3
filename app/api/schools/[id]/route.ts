// =============================================================================
// SCHOOL BY ID API
// =============================================================================

/**
 * GET /api/schools/[id]
 * Get a single school with student's tracking info if available
 *
 * The id can be either:
 * - A School id (reference data)
 * - A StudentSchool id (student's tracked school)
 *
 * We try StudentSchool first (more common from the schools list),
 * then fall back to School id (from Discover)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const profileId = await getCurrentProfileId();

    // First, try to find by StudentSchool id (when coming from student's school list)
    if (profileId) {
      const studentSchool = await prisma.studentSchool.findFirst({
        where: {
          id,
          studentProfileId: profileId,
        },
        include: {
          school: true,
        },
      });

      if (studentSchool) {
        return NextResponse.json({
          school: studentSchool.school,
          tracking: {
            id: studentSchool.id,
            tier: studentSchool.tier,
            isDream: studentSchool.isDream,
            interestLevel: studentSchool.interestLevel,
            status: studentSchool.status,
            applicationType: studentSchool.applicationType,
            decisionDate: studentSchool.decisionDate,
            financialAidOffered: studentSchool.financialAidOffered,
            notes: studentSchool.notes,
            whyInterested: studentSchool.whyInterested,
            concerns: studentSchool.concerns,
          },
        });
      }
    }

    // Next, try to find by School id (reference data)
    const school = await prisma.school.findUnique({
      where: { id },
    });

    if (!school) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }

    // Check if the current user is tracking this school
    let trackingInfo = null;
    if (profileId) {
      const tracked = await prisma.studentSchool.findFirst({
        where: {
          studentProfileId: profileId,
          schoolId: id,
        },
      });
      if (tracked) {
        trackingInfo = {
          id: tracked.id,
          tier: tracked.tier,
          isDream: tracked.isDream,
          interestLevel: tracked.interestLevel,
          status: tracked.status,
          applicationType: tracked.applicationType,
          decisionDate: tracked.decisionDate,
          financialAidOffered: tracked.financialAidOffered,
          notes: tracked.notes,
          whyInterested: tracked.whyInterested,
          concerns: tracked.concerns,
        };
      }
    }

    return NextResponse.json({
      school,
      tracking: trackingInfo,
    });
  } catch (error) {
    console.error("Error fetching school:", error);
    return NextResponse.json(
      { error: "Failed to fetch school" },
      { status: 500 }
    );
  }
}
