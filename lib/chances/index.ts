// =============================================================================
// CHANCES CALCULATION MODULE
// =============================================================================

/**
 * Main entry point for chances calculation.
 * Combines quantitative calculation with LLM assessment.
 */

import { ProfileSnapshot, buildProfileSnapshot } from "@/lib/profile-snapshot";
import { prisma } from "@/lib/db";
import { calculateQuantitative } from "./calculate-quantitative";
import { assessWithLLM } from "./assess-with-llm";
import { ChancesResult, ChancesMode, SchoolData } from "./types";

export * from "./types";
export { calculateQuantitative } from "./calculate-quantitative";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface CalculateChancesOptions {
  /**
   * Whether to use LLM for assessment
   * If false, only quantitative calculation is used
   * Default: true
   */
  useLLM?: boolean;
  
  /**
   * Whether to use quantitative calculation as base
   * If false, rely entirely on LLM
   * Default: true
   */
  useQuantitative?: boolean;
}

// Internal mode - always "trajectory" (actual + in-progress)
// This is not exposed to the API - we always calculate the full picture
const CALCULATION_MODE: ChancesMode = "projected";

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Calculate chances for a student at a specific school.
 */
export async function calculateChances(
  profileId: string,
  schoolId: string,
  options: CalculateChancesOptions = {}
): Promise<ChancesResult> {
  const {
    useLLM = true,
    useQuantitative = true,
  } = options;
  
  // Always use trajectory mode (actual + in-progress goals)
  const mode = CALCULATION_MODE;
  
  // Load profile snapshot
  const profileSnapshot = await buildProfileSnapshot(profileId, {
    includeGoals: true,
    includeSchools: true,
  });
  
  if (!profileSnapshot) {
    throw new Error("Profile not found");
  }
  
  // Load school data
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      acceptanceRate: true,
      satRange25: true,
      satRange75: true,
      actRange25: true,
      actRange75: true,
    },
  });

  if (!school) {
    throw new Error("School not found");
  }

  const schoolData: SchoolData = {
    id: school.id,
    name: school.name,
    acceptanceRate: school.acceptanceRate,
    satRange25: school.satRange25,
    satRange75: school.satRange75,
    actRange25: school.actRange25,
    actRange75: school.actRange75,
    // GPA data not available from College Scorecard - using null
    avgGpaUnweighted: null,
    avgGpaWeighted: null,
  };
  
  // Calculate quantitative base
  let quantitativeResult = null;
  if (useQuantitative) {
    quantitativeResult = calculateQuantitative(profileSnapshot, schoolData);
  }
  
  // If not using LLM, return quantitative-only result
  if (!useLLM) {
    if (!quantitativeResult) {
      throw new Error("Must use either quantitative or LLM assessment");
    }
    
    return {
      probability: quantitativeResult.baseProbability,
      tier: getTierFromProbability(quantitativeResult.baseProbability),
      mode,
      factors: {
        academics: quantitativeResult.factors.academics,
        testing: quantitativeResult.factors.testing,
        activities: {
          score: 50,
          impact: "neutral",
          details: "LLM assessment disabled",
        },
        awards: {
          score: 50,
          impact: "neutral",
          details: "LLM assessment disabled",
        },
      },
      summary: `Based on quantitative metrics, your estimated chance is ${quantitativeResult.baseProbability}%.`,
      improvements: [],
      confidence: quantitativeResult.confidence,
      confidenceReason: quantitativeResult.confidenceReason,
      calculatedAt: new Date(),
      schoolId: school.id,
      schoolName: school.name,
    };
  }
  
  // Use LLM for full assessment
  const llmResult = await assessWithLLM({
    profile: profileSnapshot,
    school: schoolData,
    mode,
    quantitativeResult: quantitativeResult || getDefaultQuantitativeResult(),
  });
  
  return llmResult;
}

/**
 * Calculate chances for multiple schools at once.
 */
export async function calculateChancesMultiple(
  profileId: string,
  schoolIds: string[],
  options: CalculateChancesOptions = {}
): Promise<Map<string, ChancesResult>> {
  const results = new Map<string, ChancesResult>();
  
  // Run calculations in parallel (with concurrency limit)
  const CONCURRENCY = 3;
  for (let i = 0; i < schoolIds.length; i += CONCURRENCY) {
    const batch = schoolIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(schoolId => 
        calculateChances(profileId, schoolId, options)
          .catch(error => {
            console.error(`Failed to calculate chances for ${schoolId}:`, error);
            return null;
          })
      )
    );
    
    batch.forEach((schoolId, index) => {
      const result = batchResults[index];
      if (result) {
        results.set(schoolId, result);
      }
    });
  }
  
  return results;
}

/**
 * Calculate and store chances for a student's school list.
 */
export async function updateStoredChances(
  profileId: string,
  options: CalculateChancesOptions = {}
): Promise<void> {
  // Get student's school list (only linked schools with schoolId)
  const studentSchools = await prisma.studentSchool.findMany({
    where: {
      studentProfileId: profileId,
      schoolId: { not: null }, // Only linked schools
    },
    select: { id: true, schoolId: true },
  });

  // Filter to only linked schools (schoolId is not null)
  const schoolIds = studentSchools
    .map(s => s.schoolId)
    .filter((id): id is string => id !== null);
  const results = await calculateChancesMultiple(profileId, schoolIds, options);

  // Update stored chances
  for (const studentSchool of studentSchools) {
    if (!studentSchool.schoolId) continue;
    const result = results.get(studentSchool.schoolId);
    if (result) {
      await prisma.studentSchool.update({
        where: { id: studentSchool.id },
        data: {
          calculatedChance: result.probability / 100, // Store as decimal
          chanceUpdatedAt: new Date(),
        },
      });
    }
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function getTierFromProbability(probability: number): ChancesResult["tier"] {
  if (probability < 15) return "unlikely";
  if (probability < 30) return "reach";
  if (probability < 50) return "target";
  if (probability < 70) return "likely";
  return "safety";
}

function getDefaultQuantitativeResult() {
  return {
    baseProbability: 50,
    factors: {
      academics: { score: 50, impact: "neutral" as const, details: "No quantitative assessment" },
      testing: { score: 50, impact: "neutral" as const, details: "No quantitative assessment" },
      acceptance_rate: { score: 50, impact: "neutral" as const, details: "No quantitative assessment" },
    },
    confidence: "low" as const,
    confidenceReason: "Quantitative assessment disabled",
  };
}

