// =============================================================================
// CHANCES CALCULATION TYPES
// =============================================================================

/**
 * Types for the chances calculation engine.
 */

// =============================================================================
// INPUT TYPES
// =============================================================================

/**
 * School data needed for chances calculation
 */
export interface SchoolData {
  id: string;
  name: string;
  acceptanceRate: number | null;
  
  // SAT ranges
  satRange25: number | null;  // 25th percentile
  satRange75: number | null;  // 75th percentile
  
  // ACT ranges
  actRange25: number | null;
  actRange75: number | null;
  
  // GPA
  avgGpaUnweighted: number | null;
  avgGpaWeighted: number | null;
}

/**
 * Mode for chances calculation
 */
export type ChancesMode = "current" | "projected" | "simulated";

// =============================================================================
// RESULT TYPES
// =============================================================================

/**
 * Impact level of a factor
 */
export type ImpactLevel = "strong_positive" | "positive" | "neutral" | "negative" | "strong_negative";

/**
 * Tier classification based on probability
 */
export type ChancesTier = "unlikely" | "reach" | "target" | "likely" | "safety";

/**
 * Individual factor assessment
 */
export interface FactorAssessment {
  score: number;  // 0-100
  impact: ImpactLevel;
  details: string;  // e.g., "Your SAT is at the 75th percentile"
}

/**
 * Quantitative calculation result (rule-based)
 */
export interface QuantitativeResult {
  // Base probability from stats
  baseProbability: number;  // 0-100
  
  // Factor breakdown
  factors: {
    academics: FactorAssessment;
    testing: FactorAssessment;
    acceptance_rate: FactorAssessment;
  };
  
  // Confidence in the calculation
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
}

/**
 * Improvement suggestion
 */
export interface Improvement {
  action: string;
  potentialImpact: string;  // e.g., "+3-5%"
  priority: "high" | "medium" | "low";
  category: "academics" | "testing" | "activities" | "awards" | "programs" | "essays";
}

/**
 * Full chances result
 */
export interface ChancesResult {
  // The headline numbers
  probability: number;  // 0-100
  tier: ChancesTier;
  
  // Mode used for this calculation
  mode: ChancesMode;
  
  // Factor breakdown
  factors: {
    academics: FactorAssessment;
    testing: FactorAssessment;
    activities: FactorAssessment;
    awards: FactorAssessment;
  };
  
  // LLM-generated narrative
  summary: string;
  
  // Comparison with other modes (if applicable)
  comparison?: {
    currentProbability: number;
    projectedProbability: number;
    projectedBoostDrivers: string[];  // ["MITES program (+5%)", "Science Fair win (+3%)"]
  };
  
  // What could help
  improvements: Improvement[];
  
  // Confidence in the assessment
  confidence: "high" | "medium" | "low";
  confidenceReason: string;
  
  // Metadata
  calculatedAt: Date;
  schoolId: string;
  schoolName: string;
}

/**
 * Simulation item that user can toggle
 */
export interface SimulationItem {
  id: string;
  type: "activity" | "award" | "program" | "goal" | "hypothetical";
  title: string;
  status: "actual" | "in_progress" | "planning" | "hypothetical";
  included: boolean;  // Whether to include in calculation
  estimatedImpact: string;  // e.g., "+3%"
}

/**
 * Simulation state for the UI
 */
export interface SimulationState {
  items: SimulationItem[];
  hypotheticals: Array<{
    id: string;
    description: string;
    type: "activity" | "award" | "program";
    estimatedImpact: string;
  }>;
}

