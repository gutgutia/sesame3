import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";
import { calculateEligibility, type EligibilityStatus } from "@/lib/eligibility/calculate-eligibility";

export async function GET(request: Request) {
  try {
    const profileId = await getCurrentProfileId();
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const url = new URL(request.url);
    const focusArea = url.searchParams.get("focus"); // e.g., "research", "STEM"
    const limit = parseInt(url.searchParams.get("limit") || "6");

    // Get student profile with relevant data for eligibility
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: {
        academics: true,
        courses: {
          where: { status: { in: ["completed", "in_progress"] } },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get current year for program filtering
    const currentYear = new Date().getFullYear();

    // Build query for summer programs
    const whereClause: Record<string, unknown> = {
      isActive: true,
      programYear: { gte: currentYear },
    };

    // Filter by focus area if specified
    if (focusArea) {
      whereClause.focusAreas = { has: focusArea.toLowerCase() };
    }

    // Fetch programs
    const programs = await prisma.summerProgram.findMany({
      where: whereClause,
      orderBy: [
        { applicationDeadline: "asc" }, // Upcoming deadlines first
        { selectivity: "asc" },
      ],
      take: 50, // Get more than needed for filtering
    });

    // Calculate eligibility for each program and score them
    const programsWithEligibility = programs.map(program => {
      const eligibility = calculateEligibility(
        {
          birthDate: profile.birthDate,
          residencyStatus: profile.residencyStatus,
          grade: profile.grade,
          graduationYear: profile.graduationYear,
          academics: profile.academics ? {
            schoolReportedGpaUnweighted: profile.academics.schoolReportedGpaUnweighted,
            schoolReportedGpaWeighted: profile.academics.schoolReportedGpaWeighted,
          } : null,
          courses: profile.courses.map(c => ({
            name: c.name,
            status: c.status,
            level: c.level,
          })),
        },
        {
          programYear: program.programYear,
          startDate: program.startDate,
          minGrade: program.minGrade,
          maxGrade: program.maxGrade,
          minAge: program.minAge,
          maxAge: program.maxAge,
          minGpaUnweighted: program.minGpaUnweighted,
          minGpaWeighted: program.minGpaWeighted,
          citizenship: program.citizenship,
          requiredCourses: program.requiredCourses,
          otherRequirements: program.otherRequirements,
          eligibilityNotes: program.eligibilityNotes,
        }
      );

      return {
        program,
        eligibility,
      };
    });

    // Filter to eligible or check_required, prioritize by eligibility
    const eligibilityOrder: Record<EligibilityStatus, number> = {
      eligible: 0,
      check_required: 1,
      unknown: 2,
      ineligible: 3,
    };

    const recommendedPrograms = programsWithEligibility
      .filter(p => p.eligibility.overall !== "ineligible")
      .sort((a, b) => {
        // Sort by eligibility status first
        const eligDiff = eligibilityOrder[a.eligibility.overall] - eligibilityOrder[b.eligibility.overall];
        if (eligDiff !== 0) return eligDiff;

        // Then by deadline (sooner first)
        const aDeadline = a.program.applicationDeadline?.getTime() || Infinity;
        const bDeadline = b.program.applicationDeadline?.getTime() || Infinity;
        return aDeadline - bDeadline;
      })
      .slice(0, limit)
      .map(({ program, eligibility }) => ({
        id: program.id,
        name: program.name,
        shortName: program.shortName,
        organization: program.organization,
        description: program.description,
        location: program.location,
        duration: program.duration,
        focusAreas: program.focusAreas,
        selectivity: program.selectivity,
        cost: program.cost,
        stipend: program.stipend,
        applicationDeadline: program.applicationDeadline,
        websiteUrl: program.websiteUrl,
        eligibility: {
          status: eligibility.overall,
          summary: eligibility.summary,
        },
      }));

    return NextResponse.json({
      programs: recommendedPrograms,
      totalFound: programsWithEligibility.filter(p => p.eligibility.overall !== "ineligible").length,
    });
  } catch (error) {
    console.error("Error fetching program recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
