import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";

type SchoolTier = "reach" | "target" | "safety";

interface SchoolMatch {
  tier: SchoolTier;
  satMatch: "below" | "within" | "above" | "unknown";
  actMatch: "below" | "within" | "above" | "unknown";
  gpaMatch: "below" | "within" | "above" | "unknown";
  overallFit: number; // 0-100 score
}

function calculateSchoolMatch(
  studentSat: number | null,
  studentAct: number | null,
  studentGpa: number | null,
  school: {
    satRange25: number | null;
    satRange75: number | null;
    actRange25: number | null;
    actRange75: number | null;
    avgGpaUnweighted: number | null;
    acceptanceRate: number | null;
  }
): SchoolMatch {
  let satMatch: SchoolMatch["satMatch"] = "unknown";
  let actMatch: SchoolMatch["actMatch"] = "unknown";
  let gpaMatch: SchoolMatch["gpaMatch"] = "unknown";
  let fitScore = 50; // Start at neutral

  // SAT match
  if (studentSat && school.satRange25 && school.satRange75) {
    if (studentSat >= school.satRange75) {
      satMatch = "above";
      fitScore += 15;
    } else if (studentSat >= school.satRange25) {
      satMatch = "within";
      fitScore += 10;
    } else {
      satMatch = "below";
      fitScore -= 15;
    }
  }

  // ACT match
  if (studentAct && school.actRange25 && school.actRange75) {
    if (studentAct >= school.actRange75) {
      actMatch = "above";
      fitScore += 15;
    } else if (studentAct >= school.actRange25) {
      actMatch = "within";
      fitScore += 10;
    } else {
      actMatch = "below";
      fitScore -= 15;
    }
  }

  // GPA match
  if (studentGpa && school.avgGpaUnweighted) {
    const gpaThresholdHigh = Math.min(school.avgGpaUnweighted + 0.2, 4.0);
    const gpaThresholdLow = school.avgGpaUnweighted - 0.3;

    if (studentGpa >= gpaThresholdHigh) {
      gpaMatch = "above";
      fitScore += 10;
    } else if (studentGpa >= gpaThresholdLow) {
      gpaMatch = "within";
      fitScore += 5;
    } else {
      gpaMatch = "below";
      fitScore -= 10;
    }
  }

  // Adjust for acceptance rate
  if (school.acceptanceRate) {
    if (school.acceptanceRate < 0.1) {
      fitScore -= 10; // Very selective schools are harder
    } else if (school.acceptanceRate > 0.5) {
      fitScore += 5; // More accessible schools
    }
  }

  // Clamp score
  fitScore = Math.max(0, Math.min(100, fitScore));

  // Determine tier based on fit score
  let tier: SchoolTier;
  if (fitScore >= 70) {
    tier = "safety";
  } else if (fitScore >= 40) {
    tier = "target";
  } else {
    tier = "reach";
  }

  return {
    tier,
    satMatch,
    actMatch,
    gpaMatch,
    overallFit: fitScore,
  };
}

export async function GET(request: Request) {
  try {
    const profileId = await getCurrentProfileId();
    if (!profileId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const url = new URL(request.url);
    const tier = url.searchParams.get("tier") as SchoolTier | null;
    const limit = parseInt(url.searchParams.get("limit") || "6");

    // Get student profile with test scores
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: {
        academics: true,
        testing: {
          include: {
            satScores: { orderBy: { total: "desc" }, take: 1 },
            actScores: { orderBy: { composite: "desc" }, take: 1 },
          },
        },
        schoolList: {
          select: { schoolId: true },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Get student's best scores
    const studentSat = profile.testing?.satScores[0]?.total || null;
    const studentAct = profile.testing?.actScores[0]?.composite || null;
    const studentGpa = profile.academics?.schoolReportedGpaUnweighted || null;

    // Schools already on list (to exclude)
    const existingSchoolIds = profile.schoolList.map(s => s.schoolId);

    // Fetch schools
    const schools = await prisma.school.findMany({
      where: {
        id: { notIn: existingSchoolIds },
        // Only get schools with some stats
        OR: [
          { satRange25: { not: null } },
          { actRange25: { not: null } },
          { avgGpaUnweighted: { not: null } },
        ],
      },
      take: 100, // Get a pool to filter
    });

    // Calculate match for each school
    const schoolsWithMatch = schools.map(school => {
      const match = calculateSchoolMatch(
        studentSat,
        studentAct,
        studentGpa,
        {
          satRange25: school.satRange25,
          satRange75: school.satRange75,
          actRange25: school.actRange25,
          actRange75: school.actRange75,
          avgGpaUnweighted: school.avgGpaUnweighted,
          acceptanceRate: school.acceptanceRate,
        }
      );

      return { school, match };
    });

    // Filter by tier if specified
    let filteredSchools = tier
      ? schoolsWithMatch.filter(s => s.match.tier === tier)
      : schoolsWithMatch;

    // Sort by fit score (for target/safety) or by prestige for reach
    filteredSchools = filteredSchools.sort((a, b) => {
      if (tier === "reach") {
        // For reach schools, sort by selectivity (lower acceptance rate = more prestigious)
        const aRate = a.school.acceptanceRate || 1;
        const bRate = b.school.acceptanceRate || 1;
        return aRate - bRate;
      }
      // For others, sort by fit score
      return b.match.overallFit - a.match.overallFit;
    });

    // If no tier specified, get a balanced mix
    let recommendations;
    if (!tier) {
      const reaches = filteredSchools.filter(s => s.match.tier === "reach").slice(0, 2);
      const targets = filteredSchools.filter(s => s.match.tier === "target").slice(0, 2);
      const safeties = filteredSchools.filter(s => s.match.tier === "safety").slice(0, 2);
      recommendations = [...reaches, ...targets, ...safeties].slice(0, limit);
    } else {
      recommendations = filteredSchools.slice(0, limit);
    }

    return NextResponse.json({
      schools: recommendations.map(({ school, match }) => ({
        id: school.id,
        name: school.name,
        shortName: school.shortName,
        city: school.city,
        state: school.state,
        type: school.type,
        acceptanceRate: school.acceptanceRate,
        satRange25: school.satRange25,
        satRange75: school.satRange75,
        actRange25: school.actRange25,
        actRange75: school.actRange75,
        avgGpaUnweighted: school.avgGpaUnweighted,
        undergradEnrollment: school.undergradEnrollment,
        match: {
          tier: match.tier,
          satMatch: match.satMatch,
          actMatch: match.actMatch,
          gpaMatch: match.gpaMatch,
          overallFit: match.overallFit,
        },
      })),
      studentStats: {
        sat: studentSat,
        act: studentAct,
        gpa: studentGpa,
      },
    });
  } catch (error) {
    console.error("Error fetching school recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
