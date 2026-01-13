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
        .describe("Classification based on your holistic assessment of the student's profile"),
      reasoning: z
        .string()
        .describe("3-5 sentences explaining why this school is a good fit, considering academics, interests, activities, and overall profile alignment"),
      matchLevel: z
        .enum(["high", "medium", "low"])
        .describe("How well this school matches the student holistically - considering academics, interests, extracurriculars, and overall fit"),
      priority: z
        .enum(["high", "medium", "low"])
        .describe("How important this recommendation is for the student to consider"),
      actionItems: z
        .array(z.string())
        .describe("2-4 specific next steps for this school"),
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
  const startTime = Date.now();
  const { profile, stage, preferences } = input;

  console.log(`[SchoolAgent] Starting school recommendations for ${profile.firstName}`);

  // Load all schools from database
  const allSchools = await loadSchoolsFromDatabase();
  console.log(`[SchoolAgent] Found ${allSchools.length} schools in database`);

  // Filter out schools already on the student's list
  const availableSchools = allSchools.filter(
    (school) => !profile.existingSchoolIds.includes(school.id)
  );
  console.log(`[SchoolAgent] ${availableSchools.length} schools available after filtering (${profile.existingSchoolIds.length} already on list)`);

  if (availableSchools.length === 0) {
    console.log("[SchoolAgent] No available schools to recommend (all are on list or DB is empty)");
    return [];
  }

  // Build the prompt with the school list
  const prompt = buildSchoolPrompt(profile, stage, preferences, availableSchools, input.sessionContext);

  try {
    const { object } = await generateObject({
      model: modelFor.fastParsing, // Use Kimi K2 for speed
      schema: SchoolRecommendationSchema,
      prompt,
    });

    // Create a map for quick lookup
    const schoolMap = new Map(allSchools.map((s) => [s.id, s.name]));

    // Convert to GeneratedRecommendation format
    // Only include recommendations for schools that exist in our database
    const recommendations = object.recommendations
      .filter((rec) => schoolMap.has(rec.schoolId))
      .map((rec) => ({
        category: "school" as const,
        title: schoolMap.get(rec.schoolId)!,
        subtitle: `${rec.tier.charAt(0).toUpperCase() + rec.tier.slice(1)} School`,
        reasoning: rec.reasoning,
        // Use matchLevel directly as priority for display
        priority: rec.matchLevel,
        actionItems: rec.actionItems,
        relevantGrade: stage.grade,
        schoolId: rec.schoolId,
      }));

    console.log(`[SchoolAgent] Generated ${recommendations.length} school recommendations in ${Date.now() - startTime}ms`);
    return recommendations;
  } catch (error) {
    console.error("[SchoolAgent] Error generating school recommendations:", error);
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
  availableSchools: SchoolOption[],
  sessionContext: RecommendationInput["sessionContext"]
): string {
  const parts: string[] = [];

  parts.push("You are a college admissions expert helping a high school student build their college list.");
  parts.push("");

  // Add session context if available - this is KEY for personalization
  if (sessionContext) {
    parts.push("## Recent Conversations & Insights");
    parts.push("");
    parts.push("**IMPORTANT**: Use these insights from recent advisor conversations to personalize your recommendations.");
    parts.push("");

    if (sessionContext.studentUnderstanding) {
      parts.push("### What We Know About This Student");
      parts.push(sessionContext.studentUnderstanding);
      parts.push("");
    }

    if (sessionContext.recentSessions) {
      parts.push("### Recent Session Summary");
      parts.push(sessionContext.recentSessions);
      parts.push("");
    }

    // Include active conversation if present - this is the most immediate context
    if (sessionContext.activeConversation && sessionContext.activeConversation.messages.length > 0) {
      parts.push("### Current Conversation (Active Session)");
      parts.push("The student is currently talking with the advisor. Here's what they've discussed:");
      parts.push("");
      // Include last 10 messages from active conversation
      const recentMessages = sessionContext.activeConversation.messages.slice(-10);
      recentMessages.forEach((msg) => {
        const role = msg.role === "user" ? "Student" : "Advisor";
        parts.push(`**${role}**: ${msg.content.substring(0, 500)}${msg.content.length > 500 ? "..." : ""}`);
      });
      parts.push("");
      parts.push("**Use this conversation context to tailor your recommendations!**");
      parts.push("");
    }

    if (sessionContext.openCommitments) {
      parts.push("### Open Commitments");
      parts.push(sessionContext.openCommitments);
      parts.push("");
    }
  }

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
  parts.push("Based on this student's complete profile, recommend 5-8 colleges from the list above. Include a mix of:");
  parts.push("- 2-3 Reach schools (acceptance rate significantly below what their stats suggest)");
  parts.push("- 2-3 Target schools (realistic chances based on their profile)");
  parts.push("- 1-2 Safety schools (very likely to be admitted)");
  parts.push("");
  parts.push("IMPORTANT: You must use the exact school IDs from the list above. Do not make up IDs.");
  parts.push("");
  parts.push("## Holistic Assessment");
  parts.push("");
  parts.push("For each school recommendation, provide a HOLISTIC assessment considering:");
  parts.push("- **Academics**: GPA, test scores, course rigor relative to school requirements");
  parts.push("- **Interests & Fit**: How the student's interests, values, and aspirations align with the school's programs and culture");
  parts.push("- **Activities & Awards**: Strength and uniqueness of extracurricular involvement");
  parts.push("- **Overall Profile**: The complete picture of who this student is and how they'd thrive at this school");
  parts.push("");
  parts.push("For matchLevel, assess holistically:");
  parts.push("- **High**: Strong alignment across academics, interests, and activities. Clear fit.");
  parts.push("- **Medium**: Good potential fit with some alignment, but limited data in some areas.");
  parts.push("- **Low**: Speculative recommendation - could be good but uncertain based on profile.");
  parts.push("");
  parts.push("Write detailed reasoning (3-5 sentences) explaining WHY this school is a good fit, not just listing facts.");
  parts.push("Include 2-4 specific, actionable next steps for each school.");

  return parts.join("\n");
}
