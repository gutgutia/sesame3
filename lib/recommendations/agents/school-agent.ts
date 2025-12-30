/**
 * School Agent
 *
 * Generates school recommendations based on student profile.
 * Loads all schools from our database and has the LLM pick from them.
 * This ensures 100% linkage to our curated school data.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { modelFor } from "@/lib/ai/providers";
import { prisma } from "@/lib/db";
import type { RecommendationInput, GeneratedRecommendation } from "../types";

interface SchoolOption {
  id: string;
  name: string;
}

const SchoolRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      schoolId: z.string().describe("The ID of the school from the provided list"),
      tier: z
        .enum(["reach", "target", "safety"])
        .describe("Classification based on student's profile"),
      reasoning: z
        .string()
        .describe("2-3 sentences explaining why this school is a good fit"),
      fitScore: z
        .number()
        .min(0)
        .max(1)
        .describe("How well this school matches the student (0-1)"),
      priority: z
        .enum(["high", "medium", "low"])
        .describe("How important this recommendation is"),
      actionItems: z
        .array(z.string())
        .optional()
        .describe("Specific next steps for this school"),
    })
  ),
  summary: z
    .string()
    .optional()
    .describe("Brief overview of the school recommendations"),
});

export async function generateSchoolRecommendations(
  input: RecommendationInput
): Promise<GeneratedRecommendation[]> {
  const { profile, stage, preferences } = input;

  // Load all schools from database
  const allSchools = await loadSchoolsFromDatabase();

  // Filter out schools already on the student's list
  const availableSchools = allSchools.filter(
    (school) => !profile.existingSchoolIds.includes(school.id)
  );

  if (availableSchools.length === 0) {
    console.log("No available schools to recommend (all are on list or DB is empty)");
    return [];
  }

  // Build the prompt with the school list
  const prompt = buildSchoolPrompt(profile, stage, preferences, availableSchools);

  try {
    const { object } = await generateObject({
      model: modelFor.advisor,
      schema: SchoolRecommendationSchema,
      prompt,
    });

    // Create a map for quick lookup
    const schoolMap = new Map(allSchools.map((s) => [s.id, s.name]));

    // Convert to GeneratedRecommendation format
    // Only include recommendations for schools that exist in our database
    return object.recommendations
      .filter((rec) => schoolMap.has(rec.schoolId))
      .map((rec) => ({
        category: "school" as const,
        title: schoolMap.get(rec.schoolId)!,
        subtitle: `${rec.tier.charAt(0).toUpperCase() + rec.tier.slice(1)} School`,
        reasoning: rec.reasoning,
        fitScore: rec.fitScore,
        priority: rec.priority,
        actionItems: rec.actionItems,
        relevantGrade: stage.grade,
        schoolId: rec.schoolId,
      }));
  } catch (error) {
    console.error("Error generating school recommendations:", error);
    return [];
  }
}

/**
 * Load all schools from our database
 */
async function loadSchoolsFromDatabase(): Promise<SchoolOption[]> {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  return schools;
}

function buildSchoolPrompt(
  profile: RecommendationInput["profile"],
  stage: RecommendationInput["stage"],
  preferences: RecommendationInput["preferences"],
  availableSchools: SchoolOption[]
): string {
  const parts: string[] = [];

  parts.push("You are a college admissions expert helping a high school student build their college list.");
  parts.push("");
  parts.push("## Student Profile");
  parts.push("");

  // Basic info
  parts.push(`**Name:** ${profile.firstName} ${profile.lastName || ""}`);
  parts.push(`**Grade:** ${profile.grade || "Unknown"} (Class of ${profile.graduationYear || "Unknown"})`);
  parts.push(`**High School:** ${profile.highSchoolName || "Unknown"} (${profile.highSchoolState || "Unknown"})`);
  parts.push(`**School Type:** ${profile.highSchoolType || "Unknown"}`);

  // Academics
  parts.push("");
  parts.push("### Academics");
  if (profile.gpaUnweighted) {
    parts.push(`- GPA (Unweighted): ${profile.gpaUnweighted.toFixed(2)}`);
  }
  if (profile.gpaWeighted) {
    parts.push(`- GPA (Weighted): ${profile.gpaWeighted.toFixed(2)}`);
  }
  if (profile.classRank && profile.classSize) {
    parts.push(`- Class Rank: ${profile.classRank} of ${profile.classSize}`);
  }

  // Testing
  parts.push("");
  parts.push("### Testing");
  if (profile.satTotal) {
    parts.push(`- SAT: ${profile.satTotal}`);
  }
  if (profile.actComposite) {
    parts.push(`- ACT: ${profile.actComposite}`);
  }
  if (!profile.satTotal && !profile.actComposite) {
    parts.push("- No test scores on record yet");
  }

  // Activities
  if (profile.topActivities.length > 0) {
    parts.push("");
    parts.push("### Top Activities");
    profile.topActivities.forEach((act) => {
      const markers = [];
      if (act.isLeadership) markers.push("Leadership");
      if (act.isSpike) markers.push("Spike");
      parts.push(`- ${act.title}, ${act.organization}${markers.length > 0 ? ` [${markers.join(", ")}]` : ""}`);
    });
  }

  // Awards
  if (profile.topAwards.length > 0) {
    parts.push("");
    parts.push("### Notable Awards");
    profile.topAwards.forEach((award) => {
      parts.push(`- ${award.title} (${award.level})`);
    });
  }

  // Interests
  if (profile.interests.length > 0 || profile.aspirations) {
    parts.push("");
    parts.push("### Interests & Goals");
    if (profile.interests.length > 0) {
      parts.push(`- Interests: ${profile.interests.join(", ")}`);
    }
    if (profile.aspirations) {
      parts.push(`- Aspirations: ${profile.aspirations}`);
    }
  }

  // Preferences
  if (preferences) {
    parts.push("");
    parts.push("### Student Preferences");
    if (preferences.schoolPreferences) {
      parts.push(`What they're looking for: ${preferences.schoolPreferences}`);
    }
    if (preferences.preferredRegions.length > 0) {
      parts.push(`- Preferred regions: ${preferences.preferredRegions.join(", ")}`);
    }
    if (preferences.avoidRegions.length > 0) {
      parts.push(`- Regions to avoid: ${preferences.avoidRegions.join(", ")}`);
    }
    if (preferences.preferredSchoolSize && preferences.preferredSchoolSize !== "any") {
      parts.push(`- Preferred school size: ${preferences.preferredSchoolSize}`);
    }
    if (preferences.requireNeedBlind) {
      parts.push(`- Requires need-blind admission`);
    }
    if (preferences.requireMeritScholarships) {
      parts.push(`- Interested in merit scholarships`);
    }
  }

  // Current stage context
  parts.push("");
  parts.push("### Current Stage");
  parts.push(`The student is a ${stage.grade} in ${stage.season}. ${stage.description}`);
  parts.push(`Current priorities: ${stage.priorities.join(", ")}`);

  // Available schools from our database
  parts.push("");
  parts.push("## Available Schools");
  parts.push("");
  parts.push("You MUST only recommend schools from the following list. Each school has an ID that you must return.");
  parts.push("");
  availableSchools.forEach((school) => {
    parts.push(`- ${school.name} (ID: ${school.id})`);
  });

  // Instructions
  parts.push("");
  parts.push("## Instructions");
  parts.push("");
  parts.push("Based on this profile, recommend 5-8 colleges from the list above. Include a mix of:");
  parts.push("- 2-3 Reach schools (acceptance rate significantly below what their stats suggest)");
  parts.push("- 2-3 Target schools (realistic chances based on their profile)");
  parts.push("- 1-2 Safety schools (very likely to be admitted)");
  parts.push("");
  parts.push("IMPORTANT: You must use the exact school IDs from the list above. Do not make up IDs.");
  parts.push("");
  parts.push("For each school, explain why it's a good fit considering their academics, interests, and preferences.");
  parts.push("Use your knowledge of these colleges to assess fit - you don't need to list specific statistics.");

  return parts.join("\n");
}
