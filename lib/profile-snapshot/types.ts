// =============================================================================
// PROFILE SNAPSHOT TYPES
// =============================================================================

/**
 * ProfileSnapshot is a structured view of the student's profile.
 * Used for:
 * - Chances calculation
 * - School fit matching
 * - Program recommendations
 * - Any algorithmic assessment
 * 
 * Unlike ProfileNarrative (text for LLM), this is structured data for computations.
 */

// =============================================================================
// CORE TYPES
// =============================================================================

/**
 * Status of an item in the snapshot.
 * - actual: Completed/verified achievement
 * - in_progress: Currently working on (from goals)
 * - planning: Planned for future (from goals)
 */
export type ItemStatus = "actual" | "in_progress" | "planning";

/**
 * Academic data
 */
export interface AcademicsSnapshot {
  gpaUnweighted: number | null;
  gpaWeighted: number | null;
  gpaScale: number | null; // Usually 4.0 or 5.0
  classRank: number | null;
  classSize: number | null;
  percentile: number | null; // Calculated from rank/size
}

/**
 * Testing data
 */
export interface TestingSnapshot {
  sat: {
    total: number;
    math: number;
    reading: number;
  } | null;
  act: {
    composite: number;
    english: number;
    math: number;
    reading: number;
    science: number;
  } | null;
  psat: number | null;
  apScores: Array<{
    subject: string;
    score: number;
  }>;
}

/**
 * Activity item
 */
export interface ActivityItem {
  id: string;
  title: string;
  organization: string;
  category: string | null;
  isLeadership: boolean;
  isSpike: boolean;
  yearsActive: string | null;
  hoursPerWeek: number | null;
  description: string | null;
  status: ItemStatus;
}

/**
 * Award item
 */
export interface AwardItem {
  id: string;
  title: string;
  organization: string | null;
  level: string; // "school" | "regional" | "state" | "national" | "international"
  category: string | null;
  year: number | null;
  status: ItemStatus;
}

/**
 * Program item
 */
export interface ProgramItem {
  id: string;
  name: string;
  organization: string | null;
  type: string; // "summer" | "research" | "internship" | etc.
  selectivity: string | null;
  year: number | null;
  status: ItemStatus;
}

/**
 * Course item
 */
export interface CourseItem {
  id: string;
  name: string;
  subject: string | null;
  level: string | null; // "regular" | "honors" | "ap" | "ib" | "college"
  grade: string | null;
  status: ItemStatus; // "actual" if completed, "in_progress" if current, "planning" if planned
}

/**
 * Goal item (for advisor context and projections)
 */
export interface GoalItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: "planning" | "in_progress" | "completed" | "abandoned" | "parking_lot";
  priority: string | null;
  targetDate: Date | null;
  impactDescription: string | null;
  tasksTotal: number;
  tasksCompleted: number;
}

/**
 * School on the student's list
 */
export interface SchoolListItem {
  id: string; // StudentSchool id
  schoolId: string;
  schoolName: string;
  tier: string;
  isDream: boolean;
  interestLevel: string | null;
  applicationStatus: string;
  applicationType: string | null;
  // School stats for comparison
  school: {
    acceptanceRate: number | null;
    satRange25: number | null;
    satRange75: number | null;
    actRange25: number | null;
    actRange75: number | null;
    avgGpaUnweighted: number | null;
  };
}

// =============================================================================
// MAIN PROFILE SNAPSHOT
// =============================================================================

export interface ProfileSnapshot {
  // Student basics
  id: string;
  firstName: string;
  preferredName: string | null;
  grade: string | null;
  graduationYear: number | null;
  highSchool: {
    name: string | null;
    city: string | null;
    state: string | null;
    type: string | null; // public, private, etc.
  };
  
  // Quantitative data
  academics: AcademicsSnapshot;
  testing: TestingSnapshot;
  
  // Achievements and activities
  activities: ActivityItem[];
  awards: AwardItem[];
  programs: ProgramItem[];
  courses: CourseItem[];
  
  // Goals (for projections and advisor context)
  goals: GoalItem[];
  
  // School list
  schools: SchoolListItem[];
  
  // Summary counts (for quick reference)
  counts: {
    activities: number;
    leadershipPositions: number;
    spikeActivities: number;
    awards: number;
    nationalAwards: number;
    programs: number;
    selectivePrograms: number;
    apCourses: number;
    goalsInProgress: number;
    goalsPlanning: number;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// BUILDER OPTIONS
// =============================================================================

export interface BuildSnapshotOptions {
  /**
   * Include goals in the snapshot
   * Default: true
   */
  includeGoals?: boolean;
  
  /**
   * Include school list in the snapshot
   * Default: true
   */
  includeSchools?: boolean;
  
  /**
   * Project goals into achievements (for chances calculation)
   * If true, in_progress goals will appear as activities/awards/programs
   * Default: false
   */
  projectGoalsAsAchievements?: boolean;
}

