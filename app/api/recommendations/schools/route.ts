import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";

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
    acceptanceRate: number | null;
  }
): SchoolMatch {
  let satMatch: SchoolMatch["satMatch"] = "unknown";
  let actMatch: SchoolMatch["actMatch"] = "unknown";
  const gpaMatch: SchoolMatch["gpaMatch"] = "unknown"; // GPA data not available from College Scorecard
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

  // Note: GPA matching disabled - avgGpaUnweighted not available from College Scorecard

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

/**
 * GET - Fetch schools by names (provided by LLM) or discover based on profile
 *
 * PAID FEATURE: School recommendations require a paid subscription.
 *
 * Query params:
 * - schools: Comma-separated school names from LLM (e.g., "MIT,Stanford,CMU")
 * - tier: Filter by tier (reach/target/safety) - only for discovery mode
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
            "School recommendations are a Premium feature. Upgrade to get personalized school suggestions based on your profile.",
          feature: "recommendations",
        },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const schoolNames = url.searchParams.get("schools"); // LLM-provided names
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

    // Schools already on list (to mark as added)
    const existingSchoolIds = new Set(profile.schoolList.map(s => s.schoolId));

    let schools;

    if (schoolNames) {
      // MODE 1: LLM provided specific school names - look them up
      const names = schoolNames.split(",").map(n => n.trim());

      // Search for schools by name (fuzzy match)
      schools = await prisma.school.findMany({
        where: {
          OR: names.map(name => ({
            name: { contains: name, mode: "insensitive" },
          })),
        },
        take: limit,
      });

      // Sort by the order the LLM provided (if possible)
      const nameOrder = new Map(names.map((n, i) => [n.toLowerCase(), i]));
      schools.sort((a, b) => {
        const aOrder = nameOrder.get(a.name.toLowerCase()) ?? 999;
        const bOrder = nameOrder.get(b.name.toLowerCase()) ?? 999;
        return aOrder - bOrder;
      });
    } else {
      // MODE 2: Discovery mode - find schools based on profile
      schools = await prisma.school.findMany({
        where: {
          // Only get schools with some stats
          OR: [
            { satRange25: { not: null } },
            { actRange25: { not: null } },
            { acceptanceRate: { not: null } },
          ],
        },
        take: 100,
      });
    }

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
          acceptanceRate: school.acceptanceRate,
        }
      );

      return { school, match, alreadyOnList: existingSchoolIds.has(school.id) };
    });

    // For discovery mode, filter and balance
    let recommendations;
    if (!schoolNames) {
      // Filter by tier if specified
      let filtered = tier
        ? schoolsWithMatch.filter(s => s.match.tier === tier)
        : schoolsWithMatch;

      // Sort appropriately
      filtered = filtered.sort((a, b) => {
        if (tier === "reach") {
          const aRate = a.school.acceptanceRate || 1;
          const bRate = b.school.acceptanceRate || 1;
          return aRate - bRate;
        }
        return b.match.overallFit - a.match.overallFit;
      });

      // If no tier specified, get balanced mix
      if (!tier) {
        const reaches = filtered.filter(s => s.match.tier === "reach").slice(0, 2);
        const targets = filtered.filter(s => s.match.tier === "target").slice(0, 2);
        const safeties = filtered.filter(s => s.match.tier === "safety").slice(0, 2);
        recommendations = [...reaches, ...targets, ...safeties].slice(0, limit);
      } else {
        recommendations = filtered.slice(0, limit);
      }
    } else {
      // For LLM mode, return all matched schools in order
      recommendations = schoolsWithMatch;
    }

    return NextResponse.json({
      schools: recommendations.map(({ school, match, alreadyOnList }) => ({
        id: school.id,
        name: school.name,
        city: school.city,
        state: school.state,
        type: school.type,
        acceptanceRate: school.acceptanceRate,
        satRange25: school.satRange25,
        satRange75: school.satRange75,
        actRange25: school.actRange25,
        actRange75: school.actRange75,
        undergradEnrollment: school.undergradEnrollment,
        alreadyOnList,
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
      mode: schoolNames ? "llm" : "discovery",
    });
  } catch (error) {
    console.error("Error fetching school recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
