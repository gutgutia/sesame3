/**
 * Types for the recommendation system
 */

import type { StageInfo } from "./stage";

export interface StudentProfileSnapshot {
  id: string;
  firstName: string;
  lastName: string | null;
  grade: string | null;
  graduationYear: number | null;
  highSchoolName: string | null;
  highSchoolState: string | null;
  highSchoolType: string | null;
  residencyStatus: string | null;

  // Academics
  gpaUnweighted: number | null;
  gpaWeighted: number | null;
  classRank: number | null;
  classSize: number | null;

  // Testing
  satTotal: number | null;
  actComposite: number | null;

  // Activities summary
  topActivities: {
    title: string;
    organization: string;
    isLeadership: boolean;
    isSpike: boolean;
  }[];

  // Awards summary
  topAwards: {
    title: string;
    level: string;
  }[];

  // Interests and values (from AboutMe)
  interests: string[];
  values: string[];
  aspirations: string | null;

  // Programs already on list
  existingSchoolIds: string[];
  existingSchoolNames: string[];
  existingSummerProgramIds: string[];
}

export interface RecommendationPreferencesInput {
  schoolPreferences: string | null;
  programPreferences: string | null;
  generalPreferences: string | null;
  preferredRegions: string[];
  avoidRegions: string[];
  preferredSchoolSize: string | null;
  requireNeedBlind: boolean;
  requireMeritScholarships: boolean;
}

export interface RecommendationInput {
  profile: StudentProfileSnapshot;
  stage: StageInfo;
  preferences: RecommendationPreferencesInput | null;
}

export interface GeneratedRecommendation {
  category: "school" | "program" | "activity" | "general";
  title: string;
  subtitle?: string;
  reasoning: string;
  fitScore?: number;
  priority?: "high" | "medium" | "low";
  actionItems?: string[];
  relevantGrade?: string;
  expiresAt?: Date;

  // Reference IDs (for schools/programs we have in DB)
  schoolId?: string;
  summerProgramId?: string;
}

export interface AgentResponse {
  recommendations: GeneratedRecommendation[];
  summary?: string;
}

export interface SchoolCandidate {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  type: string | null;
  acceptanceRate: number | null;
  satRange25: number | null;
  satRange75: number | null;
  undergradEnrollment: number | null;
  notes: string | null;
}

export interface ProgramCandidate {
  id: string;
  name: string;
  organization: string;
  category: string | null;
  focusAreas: string[];
  minGrade: number | null;
  maxGrade: number | null;
  applicationDeadline: Date | null;
  llmContext: string | null;
}
