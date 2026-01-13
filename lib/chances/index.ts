// =============================================================================
// CHANCES CALCULATION MODULE
// =============================================================================

/**
 * Main entry point for chances calculation.
 * Uses Claude Opus for holistic assessment based on its training data
 * about college admissions patterns at specific schools.
 */

import { buildProfileSnapshot } from "@/lib/profile-snapshot";
import { prisma } from "@/lib/db";
import { assessWithOpus, ExtendedSchoolData } from "./assess-with-opus";
import { ChancesResult, ChancesMode, SchoolData } from "./types";

export * from "./types";

// =============================================================================
// CONFIGURATION
// =============================================================================

interface CalculateChancesOptions {
  /**
   * Whether to use LLM for assessment
   * Default: true (always use Opus)
   * Note: Setting to false will throw an error - Opus is required
   */
  useLLM?: boolean;

  /**
   * Legacy option - ignored in Opus-based implementation
   * @deprecated
   */
  useQuantitative?: boolean;
}

// Internal mode - always "trajectory" (actual + in-progress)
const CALCULATION_MODE: ChancesMode = "projected";

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Calculate chances for a student at a specific school.
 * Uses Claude Opus for holistic assessment.
 */
export async function calculateChances(
  profileId: string,
  schoolId: string,
  options: CalculateChancesOptions = {}
): Promise<ChancesResult> {
  const { useLLM = true } = options;

  if (!useLLM) {
    throw new Error("Opus-based assessment is required. Set useLLM: true or omit the option.");
  }

  // Always use trajectory mode (actual + in-progress goals)
  const mode = CALCULATION_MODE;

  // Load profile snapshot with all relevant data
  const profileSnapshot = await buildProfileSnapshot(profileId, {
    includeGoals: true,
    includeSchools: true,
  });

  if (!profileSnapshot) {
    throw new Error("Profile not found");
  }

  // Load extended school data (includes LLM context)
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      type: true,
      acceptanceRate: true,
      satRange25: true,
      satRange75: true,
      actRange25: true,
      actRange75: true,
      undergradEnrollment: true,
      notes: true, // LLM context about what the school values
      hasEarlyDecision: true,
      hasEarlyAction: true,
      isRestrictiveEarlyAction: true,
    },
  });

  if (!school) {
    throw new Error("School not found");
  }

  const schoolData: ExtendedSchoolData = {
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
    notes: school.notes,
    hasEarlyDecision: school.hasEarlyDecision,
    hasEarlyAction: school.hasEarlyAction,
    isRestrictiveEarlyAction: school.isRestrictiveEarlyAction,
    // Legacy fields - not available
    avgGpaUnweighted: null,
    avgGpaWeighted: null,
  };

  // Use Opus for holistic assessment
  const result = await assessWithOpus({
    profile: profileSnapshot,
    school: schoolData,
    mode,
  });

  return result;
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

  // Run calculations in parallel (with concurrency limit to avoid rate limits)
  const CONCURRENCY = 2; // Lower concurrency for Opus calls
  for (let i = 0; i < schoolIds.length; i += CONCURRENCY) {
    const batch = schoolIds.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((schoolId) =>
        calculateChances(profileId, schoolId, options).catch((error) => {
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
      schoolId: { not: null },
    },
    select: { id: true, schoolId: true },
  });

  // Filter to only linked schools
  const schoolIds = studentSchools
    .map((s) => s.schoolId)
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

/**
 * Get tier classification from probability.
 * Exported for use in UI components.
 */
export function getTierFromProbability(probability: number): ChancesResult["tier"] {
  if (probability < 15) return "unlikely";
  if (probability < 30) return "reach";
  if (probability < 50) return "target";
  if (probability < 70) return "likely";
  return "safety";
}
