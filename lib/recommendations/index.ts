/**
 * Recommendations Engine
 *
 * Orchestrates the recommendation generation process:
 * 1. Load student profile and preferences
 * 2. Calculate current stage
 * 3. Run specialized agents in parallel (when applicable)
 * 4. Consolidate and prioritize recommendations
 * 5. Save to database
 */

import { prisma } from "@/lib/db";
import { getStudentStage, isRecommendationTypeRelevant } from "./stage";
import { generateSchoolRecommendations } from "./agents/school-agent";
import { generateProgramRecommendations } from "./agents/program-agent";
import {
  consolidateRecommendations,
  prioritizeRecommendations,
} from "./agents/master-agent";
import type {
  StudentProfileSnapshot,
  RecommendationPreferencesInput,
  RecommendationInput,
  GeneratedRecommendation,
} from "./types";
import type { StageInfo } from "./stage";

export { getStudentStage } from "./stage";
export type { StudentStage, StageInfo } from "./stage";
export type { GeneratedRecommendation } from "./types";

interface GenerateRecommendationsResult {
  recommendations: GeneratedRecommendation[];
  stage: StageInfo;
  savedCount: number;
}

/**
 * Main entry point for generating recommendations
 */
export async function generateRecommendations(
  profileId: string
): Promise<GenerateRecommendationsResult> {
  // Load profile data
  const profile = await loadProfileSnapshot(profileId);
  if (!profile) {
    throw new Error("Profile not found");
  }

  // Calculate current stage
  const stage = getStudentStage(profile.graduationYear);

  // Load preferences
  const preferences = await loadPreferences(profileId);

  // Build input for agents
  const input: RecommendationInput = {
    profile,
    stage,
    preferences,
  };

  // Generate recommendations in parallel based on stage
  const promises: Promise<GeneratedRecommendation[]>[] = [];

  if (isRecommendationTypeRelevant("school", stage)) {
    promises.push(generateSchoolRecommendations(input));
  }

  if (isRecommendationTypeRelevant("program", stage)) {
    promises.push(generateProgramRecommendations(input));
  }

  // Wait for all agents
  const results = await Promise.all(promises);
  const schoolRecs = results[0] || [];
  const programRecs = results[1] || [];

  // Generate general recommendations via master agent
  const generalRecs = await consolidateRecommendations({
    input,
    schoolRecommendations: schoolRecs,
    programRecommendations: programRecs,
  });

  // Combine and prioritize
  const allRecommendations = prioritizeRecommendations([
    ...schoolRecs,
    ...programRecs,
    ...generalRecs,
  ]);

  // Save to database
  const savedCount = await saveRecommendations(
    profileId,
    allRecommendations,
    createProfileHash(profile)
  );

  return {
    recommendations: allRecommendations,
    stage,
    savedCount,
  };
}

/**
 * Get existing recommendations for a profile
 */
export async function getRecommendations(profileId: string) {
  const recommendations = await prisma.recommendation.findMany({
    where: {
      studentProfileId: profileId,
      status: "active",
    },
    orderBy: [
      { priority: "asc" }, // high < medium < low alphabetically
      { category: "asc" },
      { displayOrder: "asc" },
    ],
    include: {
      school: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
        },
      },
      summerProgram: {
        select: {
          id: true,
          name: true,
          organization: true,
        },
      },
    },
  });

  return recommendations;
}

/**
 * Load profile data for recommendation generation
 */
async function loadProfileSnapshot(
  profileId: string
): Promise<StudentProfileSnapshot | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    include: {
      academics: true,
      testing: {
        include: {
          satScores: { where: { isPrimary: true }, take: 1 },
          actScores: { where: { isPrimary: true }, take: 1 },
        },
      },
      activities: {
        where: { OR: [{ isLeadership: true }, { isSpike: true }] },
        take: 5,
        orderBy: { displayOrder: "asc" },
      },
      awards: {
        where: { level: { in: ["national", "international", "state"] } },
        take: 5,
        orderBy: { displayOrder: "asc" },
      },
      aboutMe: true,
      schoolList: {
        select: {
          schoolId: true,
          school: { select: { name: true } }
        }
      },
      summerProgramList: { select: { summerProgramId: true } },
    },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    grade: profile.grade,
    graduationYear: profile.graduationYear,
    highSchoolName: profile.highSchoolName,
    highSchoolState: profile.highSchoolState,
    highSchoolType: profile.highSchoolType,
    residencyStatus: profile.residencyStatus,

    // Academics
    gpaUnweighted: profile.academics?.schoolReportedGpaUnweighted ?? null,
    gpaWeighted: profile.academics?.schoolReportedGpaWeighted ?? null,
    classRank: profile.academics?.classRank ?? null,
    classSize: profile.academics?.classSize ?? null,

    // Testing
    satTotal: profile.testing?.satScores[0]?.total ?? null,
    actComposite: profile.testing?.actScores[0]?.composite ?? null,

    // Activities
    topActivities: profile.activities.map((a) => ({
      title: a.title,
      organization: a.organization,
      isLeadership: a.isLeadership,
      isSpike: a.isSpike,
    })),

    // Awards
    topAwards: profile.awards.map((a) => ({
      title: a.title,
      level: a.level,
    })),

    // About Me
    interests: profile.aboutMe?.interests ?? [],
    values: profile.aboutMe?.values ?? [],
    aspirations: profile.aboutMe?.aspirations ?? null,

    // Existing list items (filter to only linked schools/programs)
    existingSchoolIds: profile.schoolList
      .filter((s) => s.schoolId)
      .map((s) => s.schoolId as string),
    existingSchoolNames: profile.schoolList
      .filter((s) => s.school)
      .map((s) => s.school!.name),
    existingSummerProgramIds: profile.summerProgramList
      .filter((p) => p.summerProgramId)
      .map((p) => p.summerProgramId as string),
  };
}

/**
 * Load recommendation preferences
 */
async function loadPreferences(
  profileId: string
): Promise<RecommendationPreferencesInput | null> {
  const prefs = await prisma.recommendationPreferences.findUnique({
    where: { studentProfileId: profileId },
  });

  if (!prefs) return null;

  return {
    schoolPreferences: prefs.schoolPreferences,
    programPreferences: prefs.programPreferences,
    generalPreferences: prefs.generalPreferences,
    preferredRegions: prefs.preferredRegions,
    avoidRegions: prefs.avoidRegions,
    preferredSchoolSize: prefs.preferredSchoolSize,
    requireNeedBlind: prefs.requireNeedBlind,
    requireMeritScholarships: prefs.requireMeritScholarships,
  };
}

/**
 * Save recommendations to database
 */
async function saveRecommendations(
  profileId: string,
  recommendations: GeneratedRecommendation[],
  profileVersion: string
): Promise<number> {
  // Clear old active recommendations
  await prisma.recommendation.updateMany({
    where: {
      studentProfileId: profileId,
      status: "active",
    },
    data: {
      status: "dismissed",
      dismissedAt: new Date(),
    },
  });

  // Insert new recommendations
  const data = recommendations.map((rec, index) => ({
    studentProfileId: profileId,
    category: rec.category,
    title: rec.title,
    subtitle: rec.subtitle ?? null,
    reasoning: rec.reasoning,
    fitScore: rec.fitScore ?? null,
    priority: rec.priority ?? null,
    actionItems: rec.actionItems ?? [],
    relevantGrade: rec.relevantGrade ?? null,
    expiresAt: rec.expiresAt ?? null,
    schoolId: rec.schoolId ?? null,
    summerProgramId: rec.summerProgramId ?? null,
    generatedBy: "recommendation_engine",
    profileVersion,
    displayOrder: index,
  }));

  await prisma.recommendation.createMany({
    data,
  });

  return data.length;
}

/**
 * Create a simple hash of the profile for change detection
 */
function createProfileHash(profile: StudentProfileSnapshot): string {
  const hashData = {
    grade: profile.grade,
    gpa: profile.gpaUnweighted,
    sat: profile.satTotal,
    act: profile.actComposite,
    activities: profile.topActivities.length,
    awards: profile.topAwards.length,
    interests: profile.interests.length,
  };
  return Buffer.from(JSON.stringify(hashData)).toString("base64");
}

/**
 * Dismiss a recommendation
 */
export async function dismissRecommendation(
  recommendationId: string,
  feedback?: string
) {
  return prisma.recommendation.update({
    where: { id: recommendationId },
    data: {
      status: "dismissed",
      userFeedback: feedback ?? null,
      dismissedAt: new Date(),
    },
  });
}

/**
 * Save a recommendation (mark as saved by user)
 */
export async function saveRecommendation(recommendationId: string) {
  return prisma.recommendation.update({
    where: { id: recommendationId },
    data: {
      status: "saved",
      savedAt: new Date(),
    },
  });
}

/**
 * Mark a recommendation as acted upon
 */
export async function markRecommendationActedUpon(recommendationId: string) {
  return prisma.recommendation.update({
    where: { id: recommendationId },
    data: {
      status: "acted_upon",
    },
  });
}
