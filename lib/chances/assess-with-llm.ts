// =============================================================================
// LLM-BASED CHANCES ASSESSMENT
// =============================================================================

/**
 * Uses Claude to assess soft factors and generate narrative.
 * This refines the quantitative calculation with qualitative insights.
 */

import { generateText } from "ai";
import { modelFor } from "@/lib/ai/providers";
import { 
  ProfileSnapshot, 
  ActivityItem, 
  AwardItem, 
  ProgramItem, 
  GoalItem 
} from "@/lib/profile-snapshot";
import {
  SchoolData,
  ChancesResult,
  ChancesMode,
  QuantitativeResult,
  FactorAssessment,
  Improvement,
  ChancesTier,
  ImpactLevel,
} from "./types";

// =============================================================================
// MAIN LLM ASSESSMENT
// =============================================================================

interface AssessWithLLMParams {
  profile: ProfileSnapshot;
  school: SchoolData;
  mode: ChancesMode;
  quantitativeResult: QuantitativeResult;
}

/**
 * Use LLM to assess soft factors and generate final chances result.
 */
export async function assessWithLLM(
  params: AssessWithLLMParams
): Promise<ChancesResult> {
  const { profile, school, mode, quantitativeResult } = params;
  
  // Build the prompt
  const prompt = buildAssessmentPrompt(profile, school, mode, quantitativeResult);
  
  try {
    // Call Claude for assessment
    const result = await generateText({
      model: modelFor.advisor,
      system: ASSESSMENT_SYSTEM_PROMPT,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent assessments
    });
    
    // Parse the response
    const assessment = parseAssessmentResponse(result.text, quantitativeResult);
    
    return {
      probability: assessment.finalProbability,
      tier: assessment.tier,
      mode,
      factors: {
        academics: quantitativeResult.factors.academics,
        testing: quantitativeResult.factors.testing,
        activities: assessment.activitiesAssessment,
        awards: assessment.awardsAssessment,
      },
      summary: assessment.summary,
      improvements: assessment.improvements,
      confidence: quantitativeResult.confidence,
      confidenceReason: quantitativeResult.confidenceReason,
      calculatedAt: new Date(),
      schoolId: school.id,
      schoolName: school.name,
    };
  } catch (error) {
    console.error("LLM assessment error:", error);
    
    // Fallback to quantitative-only result
    return buildFallbackResult(profile, school, mode, quantitativeResult);
  }
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

const ASSESSMENT_SYSTEM_PROMPT = `You are an expert college admissions counselor assessing a student's chances at a specific school.

Your task is to:
1. Evaluate the student's activities, awards, and overall profile
2. Assess fit with the target school
3. Provide a final probability estimate
4. Generate a helpful narrative summary
5. Suggest improvements

IMPORTANT: Be realistic but encouraging. Don't give false hope, but don't crush dreams either.

Respond in the following JSON format:
{
  "activitiesScore": 0-100,
  "activitiesImpact": "strong_positive" | "positive" | "neutral" | "negative" | "strong_negative",
  "activitiesDetails": "Brief assessment of activities",
  "awardsScore": 0-100,
  "awardsImpact": "strong_positive" | "positive" | "neutral" | "negative" | "strong_negative",
  "awardsDetails": "Brief assessment of awards",
  "probabilityAdjustment": -20 to +20,
  "adjustmentReason": "Why you're adjusting the base probability",
  "summary": "2-4 sentence narrative explaining the student's chances",
  "improvements": [
    {
      "action": "What to do",
      "potentialImpact": "+X%",
      "priority": "high" | "medium" | "low",
      "category": "academics" | "testing" | "activities" | "awards" | "programs" | "essays"
    }
  ]
}`;

function buildAssessmentPrompt(
  profile: ProfileSnapshot,
  school: SchoolData,
  mode: ChancesMode,
  quantitativeResult: QuantitativeResult
): string {
  // Build student profile summary
  const studentSummary = buildStudentSummary(profile, mode);
  
  // Build school summary
  const schoolSummary = buildSchoolSummary(school);
  
  // Build quantitative context
  const quantContext = buildQuantitativeContext(quantitativeResult);
  
  return `
## Student Profile

${studentSummary}

## Target School

${schoolSummary}

## Quantitative Assessment (Already Calculated)

${quantContext}

## Your Task

Based on the student's activities, awards, goals, and overall profile:

1. Score their ACTIVITIES (0-100) and assess impact
2. Score their AWARDS (0-100) and assess impact
3. Determine if you need to ADJUST the base probability (within -20 to +20)
4. Write a helpful SUMMARY explaining their chances
5. Suggest 2-4 IMPROVEMENTS that could help

Mode: ${mode.toUpperCase()}
${mode === "current" ? "Only consider completed achievements." : ""}
${mode === "projected" ? "Include in-progress goals as likely achievements." : ""}
${mode === "simulated" ? "Include all planned and hypothetical items." : ""}

Respond ONLY with the JSON format specified.`;
}

function buildStudentSummary(profile: ProfileSnapshot, mode: ChancesMode): string {
  const parts: string[] = [];
  
  // Basic info
  const name = profile.preferredName || profile.firstName;
  parts.push(`**${name}**, ${profile.grade || "unknown grade"}`);
  if (profile.highSchool.name) {
    parts.push(`at ${profile.highSchool.name} (${profile.highSchool.type || "unknown type"})`);
  }
  
  // Academics
  if (profile.academics.gpaUnweighted) {
    let academicStr = `GPA: ${profile.academics.gpaUnweighted}`;
    if (profile.academics.classRank && profile.academics.classSize) {
      academicStr += ` (rank ${profile.academics.classRank}/${profile.academics.classSize})`;
    }
    parts.push(academicStr);
  }
  
  // Testing
  if (profile.testing.sat) {
    parts.push(`SAT: ${profile.testing.sat.total} (${profile.testing.sat.math}M/${profile.testing.sat.reading}RW)`);
  }
  if (profile.testing.act) {
    parts.push(`ACT: ${profile.testing.act.composite}`);
  }
  
  // Activities
  if (profile.activities.length > 0) {
    const activityList = profile.activities.slice(0, 5).map((a: ActivityItem) => {
      let str = `${a.title} at ${a.organization}`;
      if (a.isLeadership) str += " [LEADERSHIP]";
      if (a.isSpike) str += " [SPIKE]";
      return str;
    });
    parts.push(`\nActivities (${profile.counts.activities} total, ${profile.counts.leadershipPositions} leadership):\n- ${activityList.join("\n- ")}`);
  }
  
  // Awards
  if (profile.awards.length > 0) {
    const awardList = profile.awards.slice(0, 5).map((a: AwardItem) => 
      `${a.title} (${a.level})`
    );
    parts.push(`\nAwards (${profile.counts.awards} total, ${profile.counts.nationalAwards} national+):\n- ${awardList.join("\n- ")}`);
  }
  
  // Programs
  if (profile.programs.length > 0) {
    const programList = profile.programs.slice(0, 3).map((p: ProgramItem) => 
      `${p.name}${p.selectivity ? ` [${p.selectivity}]` : ""}`
    );
    parts.push(`\nPrograms:\n- ${programList.join("\n- ")}`);
  }
  
  // Goals (for projected/simulated mode)
  if (mode !== "current" && profile.goals.length > 0) {
    const inProgress = profile.goals.filter((g: GoalItem) => g.status === "in_progress");
    const planning = profile.goals.filter((g: GoalItem) => g.status === "planning");
    
    if (inProgress.length > 0 && (mode === "projected" || mode === "simulated")) {
      const goalList = inProgress.map((g: GoalItem) => 
        `${g.title} (${g.category}) - ${g.tasksCompleted}/${g.tasksTotal} tasks done`
      );
      parts.push(`\nIn Progress Goals:\n- ${goalList.join("\n- ")}`);
    }
    
    if (planning.length > 0 && mode === "simulated") {
      const goalList = planning.map((g: GoalItem) => g.title);
      parts.push(`\nPlanned Goals:\n- ${goalList.join("\n- ")}`);
    }
  }
  
  return parts.join("\n");
}

function buildSchoolSummary(school: SchoolData): string {
  const parts: string[] = [];
  
  parts.push(`**${school.name}**`);
  
  if (school.acceptanceRate) {
    parts.push(`Acceptance Rate: ${(school.acceptanceRate * 100).toFixed(1)}%`);
  }
  
  if (school.satRange25 && school.satRange75) {
    parts.push(`SAT Range: ${school.satRange25}-${school.satRange75}`);
  }
  
  if (school.actRange25 && school.actRange75) {
    parts.push(`ACT Range: ${school.actRange25}-${school.actRange75}`);
  }
  
  if (school.avgGpaUnweighted) {
    parts.push(`Average GPA: ${school.avgGpaUnweighted}`);
  }
  
  return parts.join("\n");
}

function buildQuantitativeContext(result: QuantitativeResult): string {
  return `Base Probability: ${result.baseProbability}%

Academics: ${result.factors.academics.score}/100 (${result.factors.academics.impact})
- ${result.factors.academics.details}

Testing: ${result.factors.testing.score}/100 (${result.factors.testing.impact})
- ${result.factors.testing.details}

Acceptance Rate Factor: ${result.factors.acceptance_rate.score}/100 (${result.factors.acceptance_rate.impact})
- ${result.factors.acceptance_rate.details}

Confidence: ${result.confidence} - ${result.confidenceReason}`;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

interface ParsedAssessment {
  finalProbability: number;
  tier: ChancesTier;
  activitiesAssessment: FactorAssessment;
  awardsAssessment: FactorAssessment;
  summary: string;
  improvements: Improvement[];
}

function parseAssessmentResponse(
  responseText: string,
  quantitativeResult: QuantitativeResult
): ParsedAssessment {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }
    
    const parsed = JSON.parse(jsonStr.trim());
    
    // Calculate final probability with adjustment
    const adjustment = Math.max(-20, Math.min(20, parsed.probabilityAdjustment || 0));
    const finalProbability = Math.max(1, Math.min(95, quantitativeResult.baseProbability + adjustment));
    
    // Determine tier
    const tier = getTierFromProbability(finalProbability);
    
    return {
      finalProbability: Math.round(finalProbability),
      tier,
      activitiesAssessment: {
        score: parsed.activitiesScore || 50,
        impact: parsed.activitiesImpact || "neutral",
        details: parsed.activitiesDetails || "Activities assessment not available",
      },
      awardsAssessment: {
        score: parsed.awardsScore || 50,
        impact: parsed.awardsImpact || "neutral",
        details: parsed.awardsDetails || "Awards assessment not available",
      },
      summary: parsed.summary || "Assessment summary not available.",
      improvements: (parsed.improvements || []).map((imp: Partial<Improvement>) => ({
        action: imp.action || "Improve your profile",
        potentialImpact: imp.potentialImpact || "+1-2%",
        priority: imp.priority || "medium",
        category: imp.category || "activities",
      })),
    };
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    
    // Return default assessment
    return {
      finalProbability: quantitativeResult.baseProbability,
      tier: getTierFromProbability(quantitativeResult.baseProbability),
      activitiesAssessment: {
        score: 50,
        impact: "neutral" as ImpactLevel,
        details: "Could not assess activities",
      },
      awardsAssessment: {
        score: 50,
        impact: "neutral" as ImpactLevel,
        details: "Could not assess awards",
      },
      summary: "We calculated your base chances but couldn't complete the full assessment. Please try again.",
      improvements: [],
    };
  }
}

function getTierFromProbability(probability: number): ChancesTier {
  if (probability < 15) return "unlikely";
  if (probability < 30) return "reach";
  if (probability < 50) return "target";
  if (probability < 70) return "likely";
  return "safety";
}

// =============================================================================
// FALLBACK
// =============================================================================

function buildFallbackResult(
  profile: ProfileSnapshot,
  school: SchoolData,
  mode: ChancesMode,
  quantitativeResult: QuantitativeResult
): ChancesResult {
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
        details: "Activities assessment unavailable",
      },
      awards: {
        score: 50,
        impact: "neutral",
        details: "Awards assessment unavailable",
      },
    },
    summary: `Based on your academic metrics, your estimated chance at ${school.name} is ${quantitativeResult.baseProbability}%. This is a preliminary estimate - full assessment temporarily unavailable.`,
    improvements: [],
    confidence: "low",
    confidenceReason: "Full assessment unavailable - showing quantitative estimate only",
    calculatedAt: new Date(),
    schoolId: school.id,
    schoolName: school.name,
  };
}

