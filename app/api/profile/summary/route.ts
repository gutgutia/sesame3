import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";

/**
 * GET /api/profile/summary
 * Lightweight endpoint for fast initial page load
 * Returns only essential data needed to render the UI shell
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

    // Fetch only essential fields for fast rendering
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        grade: true,
        graduationYear: true,
        highSchoolName: true,
        onboardingCompletedAt: true,
        // Counts for dashboard widgets (fast aggregates)
        _count: {
          select: {
            courses: true,
            activities: true,
            awards: true,
            goals: true,
            schoolList: true,
          },
        },
        // Just the best test scores for quick display
        testing: {
          select: {
            satScores: {
              orderBy: { total: "desc" },
              take: 1,
              select: { total: true, math: true, reading: true },
            },
            actScores: {
              orderBy: { composite: "desc" },
              take: 1,
              select: { composite: true },
            },
          },
        },
        // GPA from academics
        academics: {
          select: {
            schoolReportedGpaUnweighted: true,
            schoolReportedGpaWeighted: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Transform to a flat, efficient structure
    const summary = {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      preferredName: profile.preferredName,
      grade: profile.grade,
      graduationYear: profile.graduationYear,
      highSchoolName: profile.highSchoolName,
      onboardingCompletedAt: profile.onboardingCompletedAt,
      // Counts
      counts: {
        courses: profile._count.courses,
        activities: profile._count.activities,
        awards: profile._count.awards,
        goals: profile._count.goals,
        schools: profile._count.schoolList,
      },
      // Best scores
      bestSAT: profile.testing?.satScores[0] || null,
      bestACT: profile.testing?.actScores[0]?.composite || null,
      // GPA
      gpaUnweighted: profile.academics?.schoolReportedGpaUnweighted || null,
      gpaWeighted: profile.academics?.schoolReportedGpaWeighted || null,
    };

    return NextResponse.json(summary, {
      headers: {
        // Cache for 60 seconds, allow stale for 5 minutes while revalidating
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching profile summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile summary" },
      { status: 500 }
    );
  }
}
