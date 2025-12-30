/**
 * School Agent
 *
 * Generates school recommendations based on student profile.
 * Uses the LLM's existing knowledge of schools rather than loading extensive data.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { modelFor } from "@/lib/ai/providers";
import type { RecommendationInput, GeneratedRecommendation } from "../types";

const SchoolRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      name: z.string().describe("Full name of the school"),
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

  // Build the prompt
  const prompt = buildSchoolPrompt(profile, stage, preferences);

  try {
    const { object } = await generateObject({
      model: modelFor.advisor,
      schema: SchoolRecommendationSchema,
      prompt,
    });

    // Convert to GeneratedRecommendation format
    return object.recommendations.map((rec) => ({
      category: "school" as const,
      title: rec.name,
      subtitle: `${rec.tier.charAt(0).toUpperCase() + rec.tier.slice(1)} School`,
      reasoning: rec.reasoning,
      fitScore: rec.fitScore,
      priority: rec.priority,
      actionItems: rec.actionItems,
      relevantGrade: stage.grade,
    }));
  } catch (error) {
    console.error("Error generating school recommendations:", error);
    return [];
  }
}

function buildSchoolPrompt(
  profile: RecommendationInput["profile"],
  stage: RecommendationInput["stage"],
  preferences: RecommendationInput["preferences"]
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

  // Schools already on list
  if (profile.existingSchoolIds.length > 0) {
    parts.push("");
    parts.push(`Note: The student already has ${profile.existingSchoolIds.length} schools on their list. Focus on schools that would complement their existing choices.`);
  }

  // Current stage context
  parts.push("");
  parts.push("### Current Stage");
  parts.push(`The student is a ${stage.grade} in ${stage.season}. ${stage.description}`);
  parts.push(`Current priorities: ${stage.priorities.join(", ")}`);

  // Instructions
  parts.push("");
  parts.push("## Instructions");
  parts.push("");
  parts.push("Based on this profile, recommend 5-8 colleges that would be good fits. Include a mix of:");
  parts.push("- 2-3 Reach schools (acceptance rate significantly below what their stats suggest)");
  parts.push("- 2-3 Target schools (realistic chances based on their profile)");
  parts.push("- 1-2 Safety schools (very likely to be admitted)");
  parts.push("");
  parts.push("For each school, explain why it's a good fit considering their academics, interests, and preferences.");
  parts.push("Use your knowledge of colleges - you don't need to list specific statistics, just explain the fit.");

  return parts.join("\n");
}
