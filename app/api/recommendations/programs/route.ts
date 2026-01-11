import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";
import { calculateEligibility, type EligibilityStatus } from "@/lib/eligibility/calculate-eligibility";

/**
 * Helper to check if user has paid subscription
 */
async function checkPaidAccess(profileId: string): Promise<boolean> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: {
      user: {
        select: { subscriptionTier: true },
      },
    },
  });
  return profile?.user.subscriptionTier === "paid";
}

/**
 * GET - Fetch programs by names (provided by LLM) or discover based on profile
 *
 * PAID FEATURE: Program recommendations require a paid subscription.
 *
 * Query params:
 * - programs: Comma-separated program names from LLM (e.g., "RSI,MITES,Stanford SIMR")
 * - focus: Filter by focus area (e.g., "research", "STEM") - only for discovery mode
 * - limit: Max results
 */
export async function GET(request: Request) {
  try {
    const profileId = await getCurrentProfileId();
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check subscription tier
    const isPaid = await checkPaidAccess(profileId);
    if (!isPaid) {
      return NextResponse.json(
        {
          error: "paid_feature",
          message:
            "Program recommendations are a Premium feature. Upgrade to get personalized summer program suggestions based on your profile.",
          feature: "recommendations",
        },
        { status: 403 }
      );
    }

    // Parse query params
    const url = new URL(request.url);
    const programNames = url.searchParams.get("programs"); // LLM-provided names
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

    let programs;

    if (programNames) {
      // MODE 1: LLM provided specific program names - look them up
      const names = programNames.split(",").map(n => n.trim());

      // Search for programs by name (fuzzy match)
      programs = await prisma.summerProgram.findMany({
        where: {
          OR: names.flatMap(name => [
            { name: { contains: name, mode: "insensitive" } },
            { shortName: { contains: name, mode: "insensitive" } },
          ]),
          isActive: true,
        },
        take: limit,
      });

      // Sort by the order the LLM provided (if possible)
      const nameOrder = new Map(names.map((n, i) => [n.toLowerCase(), i]));
      programs.sort((a, b) => {
        const aOrder = nameOrder.get(a.name.toLowerCase()) ??
                       nameOrder.get(a.shortName?.toLowerCase() || "") ?? 999;
        const bOrder = nameOrder.get(b.name.toLowerCase()) ??
                       nameOrder.get(b.shortName?.toLowerCase() || "") ?? 999;
        return aOrder - bOrder;
      });
    } else {
      // MODE 2: Discovery mode - find programs based on profile
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
      programs = await prisma.summerProgram.findMany({
        where: whereClause,
        orderBy: [
          { applicationDeadline: "asc" }, // Upcoming deadlines first
        ],
        take: 50, // Get more than needed for filtering
      });
    }

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
          minGrade: program.minGrade,
          maxGrade: program.maxGrade,
          minAge: program.minAge,
          maxAge: program.maxAge,
          minGpaUnweighted: program.minGpaUnweighted,
          minGpaWeighted: program.minGpaWeighted,
          citizenship: program.citizenship,
          requiredCourses: program.requiredCourses,
          eligibilityNotes: program.eligibilityNotes,
        }
      );

      return {
        program,
        eligibility,
      };
    });

    // Handle differently based on mode
    let recommendedPrograms;

    if (programNames) {
      // LLM mode: keep all programs in order provided, don't filter
      recommendedPrograms = programsWithEligibility.map(({ program, eligibility }) => ({
        id: program.id,
        name: program.name,
        shortName: program.shortName,
        organization: program.organization,
        description: program.description,
        location: program.location,
        format: program.format,
        focusAreas: program.focusAreas,
        category: program.category,
        applicationDeadline: program.applicationDeadline,
        websiteUrl: program.websiteUrl,
        eligibility: {
          status: eligibility.overall,
          summary: eligibility.summary,
        },
      }));
    } else {
      // Discovery mode: filter and sort by eligibility
      const eligibilityOrder: Record<EligibilityStatus, number> = {
        eligible: 0,
        check_required: 1,
        unknown: 2,
        ineligible: 3,
      };

      recommendedPrograms = programsWithEligibility
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
          format: program.format,
          focusAreas: program.focusAreas,
          category: program.category,
          applicationDeadline: program.applicationDeadline,
          websiteUrl: program.websiteUrl,
          eligibility: {
            status: eligibility.overall,
            summary: eligibility.summary,
          },
        }));
    }

    return NextResponse.json({
      programs: recommendedPrograms,
      totalFound: programsWithEligibility.filter(p => p.eligibility.overall !== "ineligible").length,
      mode: programNames ? "llm" : "discovery",
    });
  } catch (error) {
    console.error("Error fetching program recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
