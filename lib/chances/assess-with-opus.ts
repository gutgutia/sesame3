// =============================================================================
// OPUS-BASED CHANCES ASSESSMENT
// =============================================================================

/**
 * Uses Claude Opus to holistically assess admission chances.
 * Instead of algorithmic weights, we let Opus use its training data
 * about college admissions to make a nuanced assessment.
 */

import { generateObject } from "ai";
import { z } from "zod";
import { modelFor } from "@/lib/ai/providers";
import { ProfileSnapshot } from "@/lib/profile-snapshot";
import {
  ChancesResult,
  ChancesMode,
  SchoolData,
  FactorAssessment,
  Improvement,
  ImpactLevel,
  ChancesTier,
} from "./types";

// =============================================================================
// SCHEMA FOR STRUCTURED OUTPUT
// =============================================================================

const ImpactLevelSchema = z.enum([
  "strong_positive",
  "positive",
  "neutral",
  "negative",
  "strong_negative",
]);

const FactorSchema = z.object({
  score: z.number().min(0).max(100).describe("Score from 0-100"),
  impact: ImpactLevelSchema.describe("Impact level on admission chances"),
  details: z.string().describe("1-2 sentence explanation of this assessment"),
});

const ImprovementSchema = z.object({
  action: z.string().describe("Specific action the student can take"),
  potentialImpact: z.string().describe("Estimated impact, e.g., '+3-5%' or 'moderate boost'"),
  priority: z.enum(["high", "medium", "low"]),
  category: z.enum(["academics", "testing", "activities", "awards", "programs", "essays"]),
});

const ChancesAssessmentSchema = z.object({
  probability: z
    .number()
    .min(1)
    .max(95)
    .describe("Estimated admission probability as a percentage (1-95)"),

  tier: z
    .enum(["unlikely", "reach", "target", "likely", "safety"])
    .describe("Classification: unlikely (<15%), reach (15-30%), target (30-50%), likely (50-70%), safety (>70%)"),

  factors: z.object({
    academics: FactorSchema.describe("Assessment of GPA, course rigor, class rank"),
    testing: FactorSchema.describe("Assessment of SAT/ACT/AP scores"),
    activities: FactorSchema.describe("Assessment of extracurriculars, leadership, depth"),
    awards: FactorSchema.describe("Assessment of honors, competitions, recognition"),
  }),

  summary: z
    .string()
    .describe("2-3 paragraph narrative summary explaining the overall assessment, key strengths, and areas of concern"),

  improvements: z
    .array(ImprovementSchema)
    .max(5)
    .describe("Top 3-5 specific actions that could improve chances"),

  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confidence in this assessment based on data completeness"),

  confidenceReason: z
    .string()
    .describe("Brief explanation of confidence level"),
});

// =============================================================================
// EXTENDED SCHOOL DATA (includes LLM context)
// =============================================================================

export interface ExtendedSchoolData extends SchoolData {
  city: string | null;
  state: string | null;
  type: string | null;
  undergradEnrollment: number | null;
  notes: string | null; // LLM context about the school
  hasEarlyDecision: boolean;
  hasEarlyAction: boolean;
  isRestrictiveEarlyAction: boolean;
}

// =============================================================================
// MAIN ASSESSMENT FUNCTION
// =============================================================================

interface AssessWithOpusParams {
  profile: ProfileSnapshot;
  school: ExtendedSchoolData;
  mode: ChancesMode;
}

export async function assessWithOpus(
  params: AssessWithOpusParams
): Promise<ChancesResult> {
  const { profile, school, mode } = params;
  const startTime = Date.now();

  console.log(`[Chances/Opus] Starting assessment for ${profile.firstName} at ${school.name}`);

  // Build the comprehensive prompt
  const prompt = buildAssessmentPrompt(profile, school, mode);

  try {
    const { object } = await generateObject({
      model: modelFor.deep, // Claude Opus - highest quality reasoning
      schema: ChancesAssessmentSchema,
      prompt,
      temperature: 0.3, // Some variability but mostly consistent
    });

    console.log(`[Chances/Opus] Assessment complete in ${Date.now() - startTime}ms`);
    console.log(`[Chances/Opus] Result: ${object.probability}% (${object.tier})`);

    return {
      probability: object.probability,
      tier: object.tier as ChancesTier,
      mode,
      factors: {
        academics: object.factors.academics as FactorAssessment,
        testing: object.factors.testing as FactorAssessment,
        activities: object.factors.activities as FactorAssessment,
        awards: object.factors.awards as FactorAssessment,
      },
      summary: object.summary,
      improvements: object.improvements as Improvement[],
      confidence: object.confidence,
      confidenceReason: object.confidenceReason,
      calculatedAt: new Date(),
      schoolId: school.id,
      schoolName: school.name,
    };
  } catch (error) {
    console.error("[Chances/Opus] Error:", error);
    throw new Error(`Failed to assess chances: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// =============================================================================
// PROMPT BUILDER
// =============================================================================

function buildAssessmentPrompt(
  profile: ProfileSnapshot,
  school: ExtendedSchoolData,
  mode: ChancesMode
): string {
  const parts: string[] = [];

  // System context
  parts.push(`You are an expert college admissions counselor with deep knowledge of ${school.name}'s admission patterns, student body, institutional priorities, and what they look for in applicants.

Your task is to provide a realistic, honest assessment of this student's chances of admission. Be neither overly optimistic nor pessimistic - aim for accuracy based on what you know about this school's admissions.`);

  parts.push("");
  parts.push("=".repeat(80));
  parts.push(`TARGET SCHOOL: ${school.name}`);
  parts.push("=".repeat(80));
  parts.push("");

  // School information
  parts.push("## School Profile");
  parts.push("");

  if (school.city && school.state) {
    parts.push(`**Location:** ${school.city}, ${school.state}`);
  }
  if (school.type) {
    parts.push(`**Type:** ${school.type}`);
  }
  if (school.undergradEnrollment) {
    parts.push(`**Undergraduate Enrollment:** ${school.undergradEnrollment.toLocaleString()}`);
  }

  parts.push("");
  parts.push("### Admission Statistics");

  if (school.acceptanceRate !== null) {
    const ratePercent = (school.acceptanceRate * 100).toFixed(1);
    parts.push(`- **Acceptance Rate:** ${ratePercent}%`);
  } else {
    parts.push(`- **Acceptance Rate:** Unknown`);
  }

  if (school.satRange25 && school.satRange75) {
    parts.push(`- **SAT Range (25th-75th percentile):** ${school.satRange25} - ${school.satRange75}`);
  }
  if (school.actRange25 && school.actRange75) {
    parts.push(`- **ACT Range (25th-75th percentile):** ${school.actRange25} - ${school.actRange75}`);
  }

  // Admission options
  const admissionOptions: string[] = [];
  if (school.hasEarlyDecision) admissionOptions.push("Early Decision");
  if (school.hasEarlyAction) admissionOptions.push("Early Action");
  if (school.isRestrictiveEarlyAction) admissionOptions.push("Restrictive Early Action");
  if (admissionOptions.length > 0) {
    parts.push(`- **Early Options:** ${admissionOptions.join(", ")}`);
  }

  // School-specific context (if available)
  if (school.notes) {
    parts.push("");
    parts.push("### What This School Values");
    parts.push(school.notes);
  }

  parts.push("");
  parts.push("=".repeat(80));
  parts.push("STUDENT PROFILE");
  parts.push("=".repeat(80));
  parts.push("");

  // Student basics
  parts.push("## Basic Information");
  parts.push("");
  parts.push(`**Name:** ${profile.firstName}${profile.preferredName ? ` (goes by ${profile.preferredName})` : ""}`);
  parts.push(`**Grade:** ${profile.grade || "Unknown"}`);
  if (profile.graduationYear) {
    parts.push(`**Graduation Year:** ${profile.graduationYear}`);
  }
  if (profile.highSchool.name) {
    const hsLocation = [profile.highSchool.city, profile.highSchool.state].filter(Boolean).join(", ");
    parts.push(`**High School:** ${profile.highSchool.name}${hsLocation ? ` (${hsLocation})` : ""}`);
    if (profile.highSchool.type) {
      parts.push(`**School Type:** ${profile.highSchool.type}`);
    }
  }

  // Academics
  parts.push("");
  parts.push("## Academics");
  parts.push("");

  if (profile.academics.gpaUnweighted !== null) {
    parts.push(`- **GPA (Unweighted):** ${profile.academics.gpaUnweighted.toFixed(2)}${profile.academics.gpaScale ? `/${profile.academics.gpaScale}` : "/4.0"}`);
  } else {
    parts.push(`- **GPA (Unweighted):** Not provided`);
  }

  if (profile.academics.gpaWeighted !== null) {
    parts.push(`- **GPA (Weighted):** ${profile.academics.gpaWeighted.toFixed(2)}`);
  }

  if (profile.academics.classRank !== null && profile.academics.classSize !== null) {
    const percentile = Math.round((1 - profile.academics.classRank / profile.academics.classSize) * 100);
    parts.push(`- **Class Rank:** ${profile.academics.classRank} of ${profile.academics.classSize} (top ${100 - percentile}%)`);
  } else if (profile.academics.percentile !== null) {
    parts.push(`- **Class Percentile:** Top ${100 - profile.academics.percentile}%`);
  }

  // Course rigor
  if (profile.counts.apCourses > 0) {
    parts.push(`- **AP/Advanced Courses:** ${profile.counts.apCourses}`);
  }

  if (profile.courses.length > 0) {
    const apCourses = profile.courses.filter(c => c.level === "ap" || c.level === "ib");
    if (apCourses.length > 0) {
      parts.push("");
      parts.push("**Notable Courses:**");
      apCourses.slice(0, 10).forEach(course => {
        const gradeStr = course.grade ? ` (${course.grade})` : "";
        parts.push(`- ${course.name}${gradeStr}`);
      });
    }
  }

  // Testing
  parts.push("");
  parts.push("## Standardized Testing");
  parts.push("");

  if (profile.testing.sat) {
    parts.push(`- **SAT Total:** ${profile.testing.sat.total}`);
    parts.push(`  - Math: ${profile.testing.sat.math}`);
    parts.push(`  - Reading/Writing: ${profile.testing.sat.reading}`);
  }

  if (profile.testing.act) {
    parts.push(`- **ACT Composite:** ${profile.testing.act.composite}`);
    parts.push(`  - English: ${profile.testing.act.english}, Math: ${profile.testing.act.math}`);
    parts.push(`  - Reading: ${profile.testing.act.reading}, Science: ${profile.testing.act.science}`);
  }

  if (!profile.testing.sat && !profile.testing.act) {
    parts.push(`- No SAT/ACT scores on record`);
  }

  if (profile.testing.psat) {
    parts.push(`- **PSAT:** ${profile.testing.psat}`);
  }

  if (profile.testing.apScores.length > 0) {
    parts.push("");
    parts.push("**AP Exam Scores:**");
    profile.testing.apScores.forEach(ap => {
      parts.push(`- ${ap.subject}: ${ap.score}`);
    });
  }

  // Activities
  parts.push("");
  parts.push("## Extracurricular Activities");
  parts.push("");

  if (profile.activities.length === 0) {
    parts.push("No activities on record.");
  } else {
    parts.push(`Total: ${profile.counts.activities} activities (${profile.counts.leadershipPositions} leadership positions, ${profile.counts.spikeActivities} "spike" activities)`);
    parts.push("");

    profile.activities.forEach((activity, index) => {
      const markers: string[] = [];
      if (activity.isLeadership) markers.push("LEADERSHIP");
      if (activity.isSpike) markers.push("SPIKE");
      if (activity.status !== "actual") markers.push(activity.status.toUpperCase());

      const markerStr = markers.length > 0 ? ` [${markers.join(", ")}]` : "";
      parts.push(`${index + 1}. **${activity.title}** - ${activity.organization}${markerStr}`);

      if (activity.yearsActive) {
        parts.push(`   Years: ${activity.yearsActive}`);
      }
      if (activity.hoursPerWeek) {
        parts.push(`   Commitment: ${activity.hoursPerWeek} hrs/week`);
      }
      if (activity.description) {
        parts.push(`   ${activity.description}`);
      }
      parts.push("");
    });
  }

  // Awards
  parts.push("");
  parts.push("## Awards & Honors");
  parts.push("");

  if (profile.awards.length === 0) {
    parts.push("No awards on record.");
  } else {
    parts.push(`Total: ${profile.counts.awards} awards (${profile.counts.nationalAwards} national/international level)`);
    parts.push("");

    profile.awards.forEach((award, index) => {
      const statusStr = award.status !== "actual" ? ` [${award.status.toUpperCase()}]` : "";
      parts.push(`${index + 1}. **${award.title}**${statusStr}`);
      parts.push(`   Level: ${award.level}${award.organization ? ` | ${award.organization}` : ""}${award.year ? ` | ${award.year}` : ""}`);
    });
  }

  // Programs
  if (profile.programs.length > 0) {
    parts.push("");
    parts.push("## Programs & Research");
    parts.push("");
    parts.push(`Total: ${profile.counts.programs} programs (${profile.counts.selectivePrograms} selective)`);
    parts.push("");

    profile.programs.forEach((program, index) => {
      const statusStr = program.status !== "actual" ? ` [${program.status.toUpperCase()}]` : "";
      parts.push(`${index + 1}. **${program.name}**${statusStr}`);
      if (program.organization) {
        parts.push(`   Organization: ${program.organization}`);
      }
      if (program.selectivity) {
        parts.push(`   Selectivity: ${program.selectivity}`);
      }
    });
  }

  // Goals (for trajectory context)
  if (profile.goals.length > 0 && (mode === "projected" || mode === "simulated")) {
    const inProgressGoals = profile.goals.filter(g => g.status === "in_progress");
    const planningGoals = profile.goals.filter(g => g.status === "planning");

    if (inProgressGoals.length > 0 || (mode === "simulated" && planningGoals.length > 0)) {
      parts.push("");
      parts.push("## Goals & Trajectory");
      parts.push("");
      parts.push("*Consider these when assessing the student's trajectory and potential:*");
      parts.push("");

      if (inProgressGoals.length > 0) {
        parts.push("**Currently Working On:**");
        inProgressGoals.forEach(goal => {
          parts.push(`- ${goal.title}${goal.description ? `: ${goal.description}` : ""}`);
        });
      }

      if (mode === "simulated" && planningGoals.length > 0) {
        parts.push("");
        parts.push("**Planning:**");
        planningGoals.forEach(goal => {
          parts.push(`- ${goal.title}${goal.description ? `: ${goal.description}` : ""}`);
        });
      }
    }
  }

  // Summary stats
  parts.push("");
  parts.push("=".repeat(80));
  parts.push("ASSESSMENT INSTRUCTIONS");
  parts.push("=".repeat(80));
  parts.push("");

  parts.push(`Based on your knowledge of ${school.name}'s admission patterns and what they value, provide a realistic assessment of this student's chances.`);
  parts.push("");
  parts.push("Consider:");
  parts.push("- How this student compares to typically admitted students at this school");
  parts.push("- The school's specific priorities and culture");
  parts.push("- Academic competitiveness (GPA relative to course rigor, test scores)");
  parts.push("- Extracurricular depth, leadership, and distinctiveness");
  parts.push("- Any hooks or factors that might help or hurt");
  parts.push("- Regional considerations and demonstrated interest patterns");
  parts.push("");
  parts.push("Be honest and realistic. It's better to give an accurate assessment than to be overly optimistic or pessimistic.");
  parts.push("");
  parts.push("Tier guidelines:");
  parts.push("- **Unlikely** (<15%): Significant gaps in profile relative to admitted students");
  parts.push("- **Reach** (15-30%): Below average for admitted students, but possible");
  parts.push("- **Target** (30-50%): Roughly matches typical admitted student profile");
  parts.push("- **Likely** (50-70%): Above average for admitted students");
  parts.push("- **Safety** (>70%): Well above typical admitted student profile");

  return parts.join("\n");
}
