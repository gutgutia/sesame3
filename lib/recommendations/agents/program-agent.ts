/**
 * Program Agent
 *
 * Generates summer program recommendations based on student profile.
 * Filters programs based on eligibility and uses LLM for fit assessment.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { modelFor } from "@/lib/ai/providers";
import { prisma } from "@/lib/db";
import type {
  RecommendationInput,
  GeneratedRecommendation,
  ProgramCandidate,
} from "../types";

const ProgramRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      programId: z.string().describe("The ID of the program from the list"),
      reasoning: z
        .string()
        .describe("3-5 sentences explaining why this program is a good fit, considering the student's interests, activities, and how it would strengthen their college application"),
      matchLevel: z
        .enum(["high", "medium", "low"])
        .describe("How well this program matches the student holistically - considering interests, activities, academic profile, and potential impact on college applications"),
      priority: z
        .enum(["high", "medium", "low"])
        .describe("How important this recommendation is for the student to consider"),
      actionItems: z
        .array(z.string())
        .describe("2-4 specific next steps for this program"),
    })
  ),
  summary: z
    .string()
    .optional()
    .describe("Brief overview of the program recommendations"),
});

export async function generateProgramRecommendations(
  input: RecommendationInput
): Promise<GeneratedRecommendation[]> {
  const startTime = Date.now();
  const { profile, stage, preferences } = input;

  console.log(`[ProgramAgent] Starting program recommendations for ${profile.firstName}`);

  // Don't recommend programs to seniors in winter/spring (too late)
  if (stage.stage === "senior_spring" || stage.stage === "senior_winter") {
    console.log("[ProgramAgent] Skipping - too late for seniors");
    return [];
  }

  // Get eligible programs from database
  const eligiblePrograms = await getEligiblePrograms(profile, stage);
  console.log(`[ProgramAgent] Found ${eligiblePrograms.length} eligible programs in database`);

  if (eligiblePrograms.length === 0) {
    console.log("[ProgramAgent] No eligible programs found");
    return [];
  }

  // Build the prompt
  const prompt = buildProgramPrompt(
    profile,
    stage,
    preferences,
    eligiblePrograms
  );

  try {
    const { object } = await generateObject({
      model: modelFor.fastParsing, // Use Kimi K2 for speed
      schema: ProgramRecommendationSchema,
      prompt,
    });

    // Map program IDs to full recommendations
    const programMap = new Map(
      eligiblePrograms.map((p) => [p.id, p])
    );

    const recommendations = object.recommendations
      .filter((rec) => programMap.has(rec.programId))
      .map((rec) => {
        const program = programMap.get(rec.programId)!;
        return {
          category: "program" as const,
          title: program.name,
          subtitle: program.organization,
          reasoning: rec.reasoning,
          // Use matchLevel directly as priority for display
          priority: rec.matchLevel,
          actionItems: rec.actionItems,
          relevantGrade: stage.grade,
          summerProgramId: program.id,
          expiresAt: program.applicationDeadline || undefined,
        };
      });

    console.log(`[ProgramAgent] Generated ${recommendations.length} program recommendations in ${Date.now() - startTime}ms`);
    return recommendations;
  } catch (error) {
    console.error("[ProgramAgent] Error generating program recommendations:", error);
    return [];
  }
}

async function getEligiblePrograms(
  profile: RecommendationInput["profile"],
  stage: RecommendationInput["stage"]
): Promise<ProgramCandidate[]> {
  // Convert grade to number for comparison
  const gradeNumber = gradeToNumber(profile.grade);

  // Get current year and target summer year
  // In fall, students look ahead to next summer; in winter/spring they're applying for this summer
  const currentYear = new Date().getFullYear();
  const targetYear = stage.season === "fall" ? currentYear + 1 : currentYear;

  const programs = await prisma.summerProgram.findMany({
    where: {
      isActive: true,
      programYear: targetYear,
      // Grade eligibility
      OR: [
        { minGrade: null, maxGrade: null },
        {
          minGrade: { lte: gradeNumber },
          maxGrade: { gte: gradeNumber },
        },
        { minGrade: { lte: gradeNumber }, maxGrade: null },
        { minGrade: null, maxGrade: { gte: gradeNumber } },
      ],
      // Exclude programs already on student's list
      NOT: {
        id: { in: profile.existingSummerProgramIds },
      },
    },
    select: {
      id: true,
      name: true,
      organization: true,
      category: true,
      focusAreas: true,
      minGrade: true,
      maxGrade: true,
      applicationDeadline: true,
      llmContext: true,
    },
    take: 20, // Limit to avoid too much context
    orderBy: [
      { applicationDeadline: "asc" },
      { name: "asc" },
    ],
  });

  return programs;
}

function gradeToNumber(grade: string | null): number {
  switch (grade) {
    case "9th":
      return 9;
    case "10th":
      return 10;
    case "11th":
      return 11;
    case "12th":
      return 12;
    default:
      return 11; // Default to junior
  }
}

function buildProgramPrompt(
  profile: RecommendationInput["profile"],
  stage: RecommendationInput["stage"],
  preferences: RecommendationInput["preferences"],
  programs: ProgramCandidate[]
): string {
  const parts: string[] = [];

  parts.push(
    "You are a college admissions expert helping a high school student find summer programs that will strengthen their application."
  );
  parts.push("");
  parts.push("## Student Profile");
  parts.push("");

  // Basic info
  parts.push(`**Name:** ${profile.firstName} ${profile.lastName || ""}`);
  parts.push(
    `**Grade:** ${profile.grade || "Unknown"} (Class of ${profile.graduationYear || "Unknown"})`
  );

  // Academics
  parts.push("");
  parts.push("### Academics");
  if (profile.gpaUnweighted) {
    parts.push(`- GPA (Unweighted): ${profile.gpaUnweighted.toFixed(2)}`);
  }
  if (profile.satTotal) {
    parts.push(`- SAT: ${profile.satTotal}`);
  }

  // Activities (key for program fit)
  if (profile.topActivities.length > 0) {
    parts.push("");
    parts.push("### Activities & Interests");
    profile.topActivities.forEach((act) => {
      const markers = [];
      if (act.isLeadership) markers.push("Leadership");
      if (act.isSpike) markers.push("Spike");
      parts.push(
        `- ${act.title}, ${act.organization}${markers.length > 0 ? ` [${markers.join(", ")}]` : ""}`
      );
    });
  }

  // Awards
  if (profile.topAwards.length > 0) {
    parts.push("");
    parts.push("### Awards");
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
  if (preferences?.programPreferences) {
    parts.push("");
    parts.push("### What They're Looking For");
    parts.push(preferences.programPreferences);
  }

  // Available programs
  parts.push("");
  parts.push("## Available Programs");
  parts.push("");
  parts.push(
    "Here are the summer programs available for this student's grade level:"
  );
  parts.push("");

  programs.forEach((program) => {
    parts.push(`### ${program.name} (ID: ${program.id})`);
    parts.push(`- Organization: ${program.organization}`);
    if (program.category) {
      parts.push(`- Category: ${program.category}`);
    }
    if (program.focusAreas.length > 0) {
      parts.push(`- Focus areas: ${program.focusAreas.join(", ")}`);
    }
    if (program.applicationDeadline) {
      parts.push(
        `- Deadline: ${program.applicationDeadline.toLocaleDateString()}`
      );
    }
    if (program.llmContext) {
      parts.push(`- Notes: ${program.llmContext}`);
    }
    parts.push("");
  });

  // Instructions
  parts.push("## Instructions");
  parts.push("");
  parts.push(
    "Based on this student's complete profile, recommend 3-5 programs that would be the best fit."
  );
  parts.push("");
  parts.push("## Holistic Assessment");
  parts.push("");
  parts.push("For each program recommendation, provide a HOLISTIC assessment considering:");
  parts.push("- **Interest Alignment**: How the program connects to the student's interests, activities, and aspirations");
  parts.push("- **Profile Strengthening**: How participating would strengthen their college application");
  parts.push("- **Realistic Fit**: Whether the student has the background and qualifications for the program");
  parts.push("- **Timing**: Deadline urgency and when in their journey this makes sense");
  parts.push("");
  parts.push("For matchLevel, assess holistically:");
  parts.push("- **High**: Clear alignment with interests/activities, strong profile fit, would meaningfully strengthen application");
  parts.push("- **Medium**: Good potential fit, some alignment with interests, beneficial but not perfectly aligned");
  parts.push("- **Low**: Speculative recommendation - could be valuable but uncertain based on current profile");
  parts.push("");
  parts.push("Write detailed reasoning (3-5 sentences) explaining WHY this program is a good fit and how it would help them.");
  parts.push("Include 2-4 specific, actionable next steps for each program.");

  return parts.join("\n");
}
