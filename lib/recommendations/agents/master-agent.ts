/**
 * Master Consolidation Agent
 *
 * Consolidates recommendations from all agents, ensures coherence,
 * and adds general recommendations.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { modelFor } from "@/lib/ai/providers";
import type { RecommendationInput, GeneratedRecommendation } from "../types";

const MasterRecommendationSchema = z.object({
  generalRecommendations: z.array(
    z.object({
      title: z.string().describe("Short title for the recommendation"),
      reasoning: z
        .string()
        .describe("2-3 sentences explaining the recommendation"),
      priority: z
        .enum(["high", "medium", "low"])
        .describe("Urgency of this recommendation"),
      actionItems: z
        .array(z.string())
        .describe("Specific next steps"),
    })
  ),
  consolidationNotes: z
    .string()
    .optional()
    .describe("Any observations about the overall recommendations"),
});

interface ConsolidationInput {
  input: RecommendationInput;
  schoolRecommendations: GeneratedRecommendation[];
  programRecommendations: GeneratedRecommendation[];
}

export async function consolidateRecommendations(
  consolidationInput: ConsolidationInput
): Promise<GeneratedRecommendation[]> {
  const { input, schoolRecommendations, programRecommendations } =
    consolidationInput;
  const { profile, stage } = input;

  // Build the consolidation prompt
  const prompt = buildConsolidationPrompt(
    profile,
    stage,
    schoolRecommendations,
    programRecommendations
  );

  try {
    const { object } = await generateObject({
      model: modelFor.fast, // Use fast model for consolidation
      schema: MasterRecommendationSchema,
      prompt,
    });

    // Convert general recommendations to the standard format
    const generalRecs: GeneratedRecommendation[] =
      object.generalRecommendations.map((rec, index) => ({
        category: "general" as const,
        title: rec.title,
        reasoning: rec.reasoning,
        priority: rec.priority,
        actionItems: rec.actionItems,
        relevantGrade: stage.grade,
        displayOrder: index,
      }));

    return generalRecs;
  } catch (error) {
    console.error("Error consolidating recommendations:", error);
    return [];
  }
}

function buildConsolidationPrompt(
  profile: RecommendationInput["profile"],
  stage: RecommendationInput["stage"],
  schoolRecs: GeneratedRecommendation[],
  programRecs: GeneratedRecommendation[]
): string {
  const parts: string[] = [];

  parts.push(
    "You are a college admissions counselor reviewing recommendations for a student."
  );
  parts.push("");
  parts.push("## Student Context");
  parts.push(`**Name:** ${profile.firstName}`);
  parts.push(`**Grade:** ${profile.grade || "Unknown"}`);
  parts.push(`**Stage:** ${stage.description}`);
  parts.push(`**Current Priorities:** ${stage.priorities.join(", ")}`);

  // Summarize interests
  if (profile.interests.length > 0) {
    parts.push(`**Interests:** ${profile.interests.join(", ")}`);
  }
  if (profile.aspirations) {
    parts.push(`**Aspirations:** ${profile.aspirations}`);
  }

  // List existing recommendations
  parts.push("");
  parts.push("## Existing Recommendations");

  if (schoolRecs.length > 0) {
    parts.push("");
    parts.push("### School Recommendations");
    schoolRecs.forEach((rec) => {
      parts.push(`- ${rec.title}: ${rec.reasoning.slice(0, 100)}...`);
    });
  }

  if (programRecs.length > 0) {
    parts.push("");
    parts.push("### Program Recommendations");
    programRecs.forEach((rec) => {
      parts.push(`- ${rec.title}: ${rec.reasoning.slice(0, 100)}...`);
    });
  }

  if (schoolRecs.length === 0 && programRecs.length === 0) {
    parts.push("No school or program recommendations yet.");
  }

  // Instructions
  parts.push("");
  parts.push("## Instructions");
  parts.push("");
  parts.push(
    "Based on the student's profile and the existing recommendations, generate 2-4 GENERAL recommendations."
  );
  parts.push(
    "These should be actionable advice that complements the school and program recommendations."
  );
  parts.push("");
  parts.push("Focus on:");
  parts.push(`- Actions relevant to a ${stage.grade} student in ${stage.season}`);
  parts.push("- Gaps in their profile that could be strengthened");
  parts.push("- Time-sensitive opportunities or deadlines");
  parts.push("- Activities or achievements that would support their goals");
  parts.push("");
  parts.push("Examples of good general recommendations:");
  parts.push('- "Start SAT prep" - if they haven\'t taken it yet');
  parts.push('- "Seek a leadership position" - if lacking leadership');
  parts.push('- "Begin college visits" - if junior/senior');
  parts.push('- "Document achievements" - to prepare for applications');

  return parts.join("\n");
}

/**
 * Prioritize and order all recommendations
 */
export function prioritizeRecommendations(
  recommendations: GeneratedRecommendation[]
): GeneratedRecommendation[] {
  // Priority order: high > medium > low
  const priorityOrder = { high: 0, medium: 1, low: 2, undefined: 3 };

  // Category order: school > program > activity > general
  const categoryOrder = { school: 0, program: 1, activity: 2, general: 3 };

  return [...recommendations].sort((a, b) => {
    // First by priority
    const priorityA = priorityOrder[a.priority || "undefined"];
    const priorityB = priorityOrder[b.priority || "undefined"];
    if (priorityA !== priorityB) return priorityA - priorityB;

    // Then by category
    const categoryA = categoryOrder[a.category];
    const categoryB = categoryOrder[b.category];
    if (categoryA !== categoryB) return categoryA - categoryB;

    // Then by fit score (higher first)
    const scoreA = a.fitScore ?? 0;
    const scoreB = b.fitScore ?? 0;
    return scoreB - scoreA;
  });
}
