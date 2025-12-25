// =============================================================================
// QUANTITATIVE CHANCES CALCULATOR
// =============================================================================

/**
 * Rule-based chances calculation using GPA, test scores, and acceptance rate.
 * This provides a baseline probability that the LLM can refine.
 * 
 * Can be toggled on/off - when off, rely entirely on LLM assessment.
 */

import { ProfileSnapshot } from "@/lib/profile-snapshot";
import {
  SchoolData,
  QuantitativeResult,
  FactorAssessment,
  ImpactLevel,
} from "./types";

// =============================================================================
// MAIN CALCULATOR
// =============================================================================

/**
 * Calculate quantitative chances based on hard metrics.
 * Returns a base probability and factor breakdown.
 */
export function calculateQuantitative(
  profile: ProfileSnapshot,
  school: SchoolData
): QuantitativeResult {
  // Calculate individual factors
  const academicsAssessment = assessAcademics(profile, school);
  const testingAssessment = assessTesting(profile, school);
  const acceptanceRateAssessment = assessAcceptanceRate(school);
  
  // Weighted combination
  // Weights: Academics 35%, Testing 35%, Base acceptance rate 30%
  const weights = {
    academics: 0.35,
    testing: 0.35,
    acceptance_rate: 0.30,
  };
  
  // Calculate base probability
  let baseProbability = 
    academicsAssessment.score * weights.academics +
    testingAssessment.score * weights.testing +
    acceptanceRateAssessment.score * weights.acceptance_rate;
  
  // Apply acceptance rate ceiling
  // Can't have higher chances than ~2x the acceptance rate for reaches
  if (school.acceptanceRate) {
    const ceiling = Math.min(school.acceptanceRate * 100 * 2.5, 80);
    baseProbability = Math.min(baseProbability, ceiling);
  }
  
  // Floor at 1% for any school
  baseProbability = Math.max(baseProbability, 1);
  
  // Round to whole number
  baseProbability = Math.round(baseProbability);
  
  // Determine confidence
  const { confidence, confidenceReason } = determineConfidence(profile, school);
  
  return {
    baseProbability,
    factors: {
      academics: academicsAssessment,
      testing: testingAssessment,
      acceptance_rate: acceptanceRateAssessment,
    },
    confidence,
    confidenceReason,
  };
}

// =============================================================================
// FACTOR ASSESSMENTS
// =============================================================================

/**
 * Assess academic strength (GPA, class rank)
 */
function assessAcademics(profile: ProfileSnapshot, school: SchoolData): FactorAssessment {
  const gpa = profile.academics.gpaUnweighted;
  const schoolAvgGpa = school.avgGpaUnweighted;
  
  // If we don't have GPA data, return neutral
  if (!gpa) {
    return {
      score: 50,
      impact: "neutral",
      details: "GPA not provided - cannot assess academic standing",
    };
  }
  
  // If school doesn't have GPA data, use general benchmarks
  if (!schoolAvgGpa) {
    // Use acceptance rate to estimate competitiveness
    if (school.acceptanceRate && school.acceptanceRate < 0.15) {
      // Highly selective - need near 4.0
      const score = calculateGpaScore(gpa, 3.95, 0.1);
      return {
        score,
        impact: getImpactLevel(score),
        details: `GPA ${gpa.toFixed(2)} for highly selective school`,
      };
    } else if (school.acceptanceRate && school.acceptanceRate < 0.40) {
      // Selective - need 3.7+
      const score = calculateGpaScore(gpa, 3.7, 0.2);
      return {
        score,
        impact: getImpactLevel(score),
        details: `GPA ${gpa.toFixed(2)} for selective school`,
      };
    } else {
      // Less selective
      const score = calculateGpaScore(gpa, 3.3, 0.3);
      return {
        score,
        impact: getImpactLevel(score),
        details: `GPA ${gpa.toFixed(2)}`,
      };
    }
  }
  
  // Compare to school average
  const diff = gpa - schoolAvgGpa;
  let score: number;
  let details: string;
  
  if (diff >= 0.1) {
    score = 85 + Math.min(diff * 50, 15);
    details = `Your GPA ${gpa.toFixed(2)} is above the school average of ${schoolAvgGpa.toFixed(2)}`;
  } else if (diff >= 0) {
    score = 70 + diff * 150;
    details = `Your GPA ${gpa.toFixed(2)} is at the school average of ${schoolAvgGpa.toFixed(2)}`;
  } else if (diff >= -0.2) {
    score = 50 + diff * 100;
    details = `Your GPA ${gpa.toFixed(2)} is slightly below the school average of ${schoolAvgGpa.toFixed(2)}`;
  } else {
    score = Math.max(20, 50 + diff * 75);
    details = `Your GPA ${gpa.toFixed(2)} is below the school average of ${schoolAvgGpa.toFixed(2)}`;
  }
  
  // Factor in class rank if available
  if (profile.academics.percentile) {
    const rankBonus = (profile.academics.percentile - 50) / 50 * 10;
    score = Math.min(100, Math.max(0, score + rankBonus));
    if (profile.academics.percentile >= 90) {
      details += ` (top ${100 - profile.academics.percentile}% of class)`;
    }
  }
  
  return {
    score: Math.round(score),
    impact: getImpactLevel(score),
    details,
  };
}

/**
 * Assess testing strength (SAT/ACT)
 */
function assessTesting(profile: ProfileSnapshot, school: SchoolData): FactorAssessment {
  const sat = profile.testing.sat?.total;
  const act = profile.testing.act?.composite;
  
  // If no test scores, return neutral
  if (!sat && !act) {
    return {
      score: 50,
      impact: "neutral",
      details: "No test scores provided",
    };
  }
  
  // Use SAT if available, otherwise convert ACT
  let satEquivalent = sat;
  if (!satEquivalent && act) {
    satEquivalent = actToSat(act);
  }
  
  if (!satEquivalent) {
    return {
      score: 50,
      impact: "neutral",
      details: "Unable to assess test scores",
    };
  }
  
  // Compare to school ranges
  const range25 = school.satRange25;
  const range75 = school.satRange75;
  
  // If school doesn't have SAT data, use acceptance rate benchmarks
  if (!range25 || !range75) {
    if (school.acceptanceRate && school.acceptanceRate < 0.10) {
      // Ivy-tier: need 1550+
      const score = calculateTestScore(satEquivalent, 1550, 30);
      return {
        score,
        impact: getImpactLevel(score),
        details: `SAT ${satEquivalent} for highly selective school`,
      };
    } else if (school.acceptanceRate && school.acceptanceRate < 0.25) {
      // Very selective: need 1480+
      const score = calculateTestScore(satEquivalent, 1480, 40);
      return {
        score,
        impact: getImpactLevel(score),
        details: `SAT ${satEquivalent} for very selective school`,
      };
    } else if (school.acceptanceRate && school.acceptanceRate < 0.50) {
      // Selective: need 1350+
      const score = calculateTestScore(satEquivalent, 1350, 60);
      return {
        score,
        impact: getImpactLevel(score),
        details: `SAT ${satEquivalent} for selective school`,
      };
    } else {
      const score = calculateTestScore(satEquivalent, 1200, 80);
      return {
        score,
        impact: getImpactLevel(score),
        details: `SAT ${satEquivalent}`,
      };
    }
  }
  
  // Compare to school's 25th/75th percentile range
  const median = (range25 + range75) / 2;
  const range = range75 - range25;
  
  let score: number;
  let details: string;
  
  if (satEquivalent >= range75) {
    score = 85 + Math.min((satEquivalent - range75) / 30 * 15, 15);
    details = `Your SAT ${satEquivalent} is above the 75th percentile (${range75})`;
  } else if (satEquivalent >= median) {
    const positionInRange = (satEquivalent - median) / (range75 - median);
    score = 70 + positionInRange * 15;
    details = `Your SAT ${satEquivalent} is between the median and 75th percentile`;
  } else if (satEquivalent >= range25) {
    const positionInRange = (satEquivalent - range25) / (median - range25);
    score = 50 + positionInRange * 20;
    details = `Your SAT ${satEquivalent} is between the 25th percentile and median`;
  } else {
    const diff = range25 - satEquivalent;
    score = Math.max(15, 50 - diff / 50 * 25);
    details = `Your SAT ${satEquivalent} is below the 25th percentile (${range25})`;
  }
  
  return {
    score: Math.round(score),
    impact: getImpactLevel(score),
    details,
  };
}

/**
 * Assess based on acceptance rate
 */
function assessAcceptanceRate(school: SchoolData): FactorAssessment {
  const rate = school.acceptanceRate;
  
  if (!rate) {
    return {
      score: 50,
      impact: "neutral",
      details: "Acceptance rate data not available",
    };
  }
  
  // Convert acceptance rate to a score
  // Higher acceptance rate = higher baseline score
  const ratePercent = rate * 100;
  
  let score: number;
  let details: string;
  let impact: ImpactLevel;
  
  if (ratePercent < 10) {
    score = ratePercent * 2; // 0-20 for <10% schools
    details = `${ratePercent.toFixed(1)}% acceptance rate - extremely selective`;
    impact = "strong_negative";
  } else if (ratePercent < 25) {
    score = 20 + (ratePercent - 10) * 1.5; // 20-42.5
    details = `${ratePercent.toFixed(1)}% acceptance rate - highly selective`;
    impact = "negative";
  } else if (ratePercent < 50) {
    score = 42.5 + (ratePercent - 25) * 1.1; // 42.5-70
    details = `${ratePercent.toFixed(1)}% acceptance rate - selective`;
    impact = "neutral";
  } else if (ratePercent < 75) {
    score = 70 + (ratePercent - 50) * 0.6; // 70-85
    details = `${ratePercent.toFixed(1)}% acceptance rate - moderately selective`;
    impact = "positive";
  } else {
    score = 85 + (ratePercent - 75) * 0.4; // 85-95
    details = `${ratePercent.toFixed(1)}% acceptance rate - less selective`;
    impact = "strong_positive";
  }
  
  return {
    score: Math.round(Math.min(score, 95)),
    impact,
    details,
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate GPA score relative to target
 */
function calculateGpaScore(gpa: number, target: number, tolerance: number): number {
  const diff = gpa - target;
  if (diff >= 0) {
    return Math.min(100, 75 + diff / 0.1 * 10);
  } else if (diff >= -tolerance) {
    return 75 + (diff / tolerance) * 25;
  } else {
    return Math.max(20, 50 + (diff + tolerance) / tolerance * 30);
  }
}

/**
 * Calculate test score relative to target
 */
function calculateTestScore(score: number, target: number, tolerance: number): number {
  const diff = score - target;
  if (diff >= 0) {
    return Math.min(100, 75 + diff / 30 * 10);
  } else if (diff >= -tolerance) {
    return 75 + (diff / tolerance) * 25;
  } else {
    return Math.max(20, 50 + (diff + tolerance) / tolerance * 30);
  }
}

/**
 * Convert ACT to SAT equivalent
 */
function actToSat(act: number): number {
  // Rough conversion table
  const conversions: Record<number, number> = {
    36: 1600, 35: 1570, 34: 1530, 33: 1500, 32: 1470,
    31: 1440, 30: 1410, 29: 1380, 28: 1350, 27: 1320,
    26: 1290, 25: 1260, 24: 1230, 23: 1200, 22: 1170,
    21: 1140, 20: 1110, 19: 1080, 18: 1050, 17: 1020,
  };
  
  return conversions[act] || 1000 + (act - 16) * 30;
}

/**
 * Get impact level from score
 */
function getImpactLevel(score: number): ImpactLevel {
  if (score >= 85) return "strong_positive";
  if (score >= 70) return "positive";
  if (score >= 50) return "neutral";
  if (score >= 35) return "negative";
  return "strong_negative";
}

/**
 * Determine confidence in the calculation
 */
function determineConfidence(
  profile: ProfileSnapshot,
  school: SchoolData
): { confidence: "high" | "medium" | "low"; confidenceReason: string } {
  const issues: string[] = [];
  
  // Check for missing data
  if (!profile.academics.gpaUnweighted) {
    issues.push("GPA not provided");
  }
  if (!profile.testing.sat && !profile.testing.act) {
    issues.push("no test scores");
  }
  if (!school.acceptanceRate) {
    issues.push("school acceptance rate unknown");
  }
  if (!school.satRange25 && !school.satRange75) {
    issues.push("school test score ranges unknown");
  }
  
  if (issues.length === 0) {
    return {
      confidence: "high",
      confidenceReason: "Complete data available for assessment",
    };
  } else if (issues.length <= 2) {
    return {
      confidence: "medium",
      confidenceReason: `Limited by: ${issues.join(", ")}`,
    };
  } else {
    return {
      confidence: "low",
      confidenceReason: `Significant data gaps: ${issues.join(", ")}`,
    };
  }
}

