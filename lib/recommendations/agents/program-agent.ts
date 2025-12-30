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
        .describe("2-3 sentences explaining why this program is a good fit"),
      fitScore: z
        .number()
        .min(0)
        .max(1)
        .describe("How well this program matches the student (0-1)"),
      priority: z
        .enum(["high", "medium", "low"])
        .describe("How important this recommendation is"),
      actionItems: z
        .array(z.string())
        .optional()
        .describe("Specific next steps for this program"),
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
  const { profile, stage, preferences } = input;

  // Don't recommend programs to seniors in spring (too late)
  if (stage.stage === "senior_spring") {
    return [];
  }

  // Get eligible programs from database
  const eligiblePrograms = await getEligiblePrograms(profile, stage);

  if (eligiblePrograms.length === 0) {
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
      model: modelFor.advisor,
      schema: ProgramRecommendationSchema,
      prompt,
    });

    // Map program IDs to full recommendations
    const programMap = new Map(
      eligiblePrograms.map((p) => [p.id, p])
    );

    return object.recommendations
      .filter((rec) => programMap.has(rec.programId))
      .map((rec) => {
        const program = programMap.get(rec.programId)!;
        return {
          category: "program" as const,
          title: program.name,
          subtitle: program.organization,
          reasoning: rec.reasoning,
          fitScore: rec.fitScore,
          priority: rec.priority,
          actionItems: rec.actionItems,
          relevantGrade: stage.grade,
          summerProgramId: program.id,
          expiresAt: program.applicationDeadline || undefined,
        };
      });
  } catch (error) {
    console.error("Error generating program recommendations:", error);
    return [];
  }
}

async function getEligiblePrograms(
  profile: RecommendationInput["profile"],
  stage: RecommendationInput["stage"]
): Promise<ProgramCandidate[]> {
  // Convert grade to number for comparison
  const gradeNumber = gradeToNumber(profile.grade);

  // Get current year
  const currentYear = new Date().getFullYear();
  const targetYear =
    stage.season === "fall" || stage.season === "spring"
      ? currentYear + 1
      : currentYear;

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
    "Based on this profile, recommend 3-5 programs that would be the best fit. Consider:"
  );
  parts.push("- Alignment with their interests and activities");
  parts.push("- How the program would strengthen their college application");
  parts.push("- Realistic chances of admission based on their profile");
  parts.push("- Deadline urgency");
  parts.push("");
  parts.push(
    "Return the program IDs from the list above with your reasoning for each."
  );

  return parts.join("\n");
}
