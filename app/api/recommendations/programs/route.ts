import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";
import { calculateEligibility, type EligibilityStatus } from "@/lib/eligibility/calculate-eligibility";
import type { SummerProgram } from "@prisma/client";

/**
 * GET - Fetch programs by names (provided by LLM) or discover based on profile
 *
 * This is a lookup endpoint - it finds programs in the database.
 * Available to all users (free and paid).
 * The monthly generation limit only applies to the main /api/recommendations POST endpoint.
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

    let programs: SummerProgram[];

    if (programNames) {
      // MODE 1: LLM provided specific program names - look them up
      const names = programNames.split(",").map(n => n.trim());

      // Extract search terms from each name
      // e.g., "MIT Research Science Institute (RSI)" -> ["MIT Research Science Institute (RSI)", "RSI", "MIT", "Research Science Institute"]
      const searchTerms: string[] = [];
      for (const name of names) {
        searchTerms.push(name);

        // Extract abbreviation from parentheses: "Something (ABC)" -> "ABC"
        const parenMatch = name.match(/\(([^)]+)\)/);
        if (parenMatch) {
          searchTerms.push(parenMatch[1]);
          // Also add the name without parentheses
          searchTerms.push(name.replace(/\s*\([^)]+\)\s*/g, "").trim());
        }

        // Handle slash-separated names: "MITES/MOSTEC" -> ["MITES", "MOSTEC"]
        if (name.includes("/")) {
          searchTerms.push(...name.split("/").map(s => s.trim()));
        }

        // Extract organization prefix if present: "MIT RSI" -> "RSI"
        const words = name.split(" ");
        if (words.length > 1) {
          // Add the last word(s) which are often the program acronym
          searchTerms.push(words[words.length - 1]);
          if (words.length > 2) {
            searchTerms.push(words.slice(-2).join(" "));
          }
        }
      }

      // Remove duplicates and empty strings
      const uniqueTerms = [...new Set(searchTerms.filter(t => t.length > 1))];

      // Search for programs by name (fuzzy match)
      programs = await prisma.summerProgram.findMany({
        where: {
          OR: uniqueTerms.flatMap(term => [
            { name: { contains: term, mode: "insensitive" } },
            { shortName: { contains: term, mode: "insensitive" } },
          ]),
          isActive: true,
        },
        take: limit * 2, // Get more to account for duplicates
      });

      // Remove duplicates (same program might match multiple terms)
      const seenIds = new Set<string>();
      programs = programs.filter(p => {
        if (seenIds.has(p.id)) return false;
        seenIds.add(p.id);
        return true;
      });

      // Sort by the order the LLM provided (if possible)
      // Try to match each program to the original name order
      const nameOrder = new Map(names.map((n, i) => [n.toLowerCase(), i]));
      programs.sort((a, b) => {
        // Try to find which original name this program matches
        const findOrder = (program: typeof programs[0]) => {
          for (const [name, order] of nameOrder) {
            const lowerName = program.name.toLowerCase();
            const lowerShortName = program.shortName?.toLowerCase() || "";
            if (lowerName.includes(name) || name.includes(lowerName) ||
                lowerShortName.includes(name) || name.includes(lowerShortName)) {
              return order;
            }
          }
          return 999;
        };
        return findOrder(a) - findOrder(b);
      });

      // Limit results
      programs = programs.slice(0, limit);
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
