/**
 * Stage Calculation Logic
 *
 * Determines the student's current stage in the college application process
 * based on their grade level and the current date.
 *
 * Stages are used to filter and prioritize recommendations:
 * - Stage determines what types of recommendations are relevant
 * - 12th graders don't get summer program recommendations
 * - Juniors in spring focus on standardized tests
 * - etc.
 */

export type StudentStage =
  | "freshman_fall"
  | "freshman_winter"
  | "freshman_spring"
  | "freshman_summer"
  | "sophomore_fall"
  | "sophomore_winter"
  | "sophomore_spring"
  | "sophomore_summer"
  | "junior_fall"
  | "junior_winter"
  | "junior_spring"
  | "junior_summer"
  | "senior_fall"
  | "senior_winter"
  | "senior_spring"
  | "post_graduation";

export type Season = "fall" | "winter" | "spring" | "summer";

export interface StageInfo {
  stage: StudentStage;
  grade: string;
  season: Season;
  graduationYear: number;
  description: string;
  priorities: string[];
  recommendationTypes: ("school" | "program" | "activity" | "general")[];
}

/**
 * Determines the current season based on the date
 * - Fall: August 15 - December 31
 * - Winter: January 1 - February 28/29
 * - Spring: March 1 - May 31
 * - Summer: June 1 - August 14
 */
export function getSeason(date: Date = new Date()): Season {
  const month = date.getMonth(); // 0-11
  const day = date.getDate();

  if (month >= 0 && month <= 1) {
    // January - February
    return "winter";
  } else if (month >= 2 && month <= 4) {
    // March - May
    return "spring";
  } else if (month >= 5 && month <= 7) {
    // June - August
    if (month === 7 && day >= 15) {
      // After August 15
      return "fall";
    }
    return "summer";
  } else {
    // September - December
    return "fall";
  }
}

/**
 * Determines the current academic year based on the date
 * Academic year starts on August 15
 * Returns the graduation year for the current seniors
 */
export function getCurrentAcademicYear(date: Date = new Date()): number {
  const month = date.getMonth();
  const day = date.getDate();
  const year = date.getFullYear();

  // If before August 15, we're in the academic year that started last fall
  if (month < 7 || (month === 7 && day < 15)) {
    return year;
  }
  // After August 15, we're in the new academic year
  return year + 1;
}

/**
 * Calculates the student's grade based on their graduation year and current date
 */
export function calculateGrade(
  graduationYear: number,
  date: Date = new Date()
): string {
  const currentAcademicYear = getCurrentAcademicYear(date);
  const yearsUntilGraduation = graduationYear - currentAcademicYear;

  switch (yearsUntilGraduation) {
    case 4:
      return "8th"; // Rising freshman
    case 3:
      return "9th"; // Freshman
    case 2:
      return "10th"; // Sophomore
    case 1:
      return "11th"; // Junior
    case 0:
      return "12th"; // Senior
    default:
      if (yearsUntilGraduation < 0) {
        return "graduated";
      }
      return "pre-high-school";
  }
}

/**
 * Gets the full stage information for a student
 *
 * @param graduationYear - Student's graduation year
 * @param options.date - Date to calculate season from (defaults to now)
 * @param options.grade - Override grade instead of calculating from graduationYear
 */
export function getStudentStage(
  graduationYear: number | null,
  options: { date?: Date; grade?: string | null } = {}
): StageInfo {
  const date = options.date ?? new Date();
  const season = getSeason(date);

  // If neither grade nor graduation year is provided, return unknown state
  if (!graduationYear && !options.grade) {
    return {
      stage: "junior_fall", // Default stage for query purposes, but UI will handle "unknown" grade
      grade: "unknown",
      season,
      graduationYear: getCurrentAcademicYear(date) + 1,
      description: "Add your grade to get personalized recommendations",
      priorities: [
        "Update your profile with your grade level",
        "Explore schools and programs",
        "Build your activity list",
      ],
      recommendationTypes: ["school", "program", "activity", "general"],
    };
  }

  // Calculate effective graduation year
  const effectiveGradYear = graduationYear ?? getCurrentAcademicYear(date) + 1;

  // Use provided grade if available, otherwise calculate from graduation year
  const grade = options.grade || calculateGrade(effectiveGradYear, date);

  // Determine stage and recommendations based on grade and season
  if (grade === "graduated" || grade === "pre-high-school") {
    return {
      stage: "post_graduation",
      grade,
      season,
      graduationYear: effectiveGradYear,
      description: "Post-graduation or pre-high school",
      priorities: [],
      recommendationTypes: [],
    };
  }

  const stageKey = `${getGradePrefix(grade)}_${season}` as StudentStage;

  return {
    stage: stageKey,
    grade,
    season,
    graduationYear: effectiveGradYear,
    ...getStageDetails(stageKey),
  };
}

function getGradePrefix(grade: string): string {
  switch (grade) {
    case "9th":
      return "freshman";
    case "10th":
      return "sophomore";
    case "11th":
      return "junior";
    case "12th":
      return "senior";
    default:
      return "freshman";
  }
}

function getStageDetails(stage: StudentStage): {
  description: string;
  priorities: string[];
  recommendationTypes: ("school" | "program" | "activity" | "general")[];
} {
  switch (stage) {
    case "freshman_fall":
      return {
        description: "Start of high school - exploration phase",
        priorities: [
          "Join clubs and activities",
          "Build good study habits",
          "Explore interests",
        ],
        recommendationTypes: ["activity", "general"],
      };

    case "freshman_winter":
      return {
        description: "First semester wrapping up",
        priorities: [
          "Finish strong in first semester",
          "Reflect on activities and interests",
          "Consider next semester courses",
        ],
        recommendationTypes: ["activity", "general"],
      };

    case "freshman_spring":
      return {
        description: "Finding your footing",
        priorities: [
          "Maintain grades",
          "Deepen activity involvement",
          "Consider summer opportunities",
        ],
        recommendationTypes: ["program", "activity", "general"],
      };

    case "freshman_summer":
      return {
        description: "First summer - exploration",
        priorities: [
          "Summer programs or camps",
          "Volunteer work",
          "Skill development",
        ],
        recommendationTypes: ["program", "activity", "general"],
      };

    case "sophomore_fall":
      return {
        description: "Building momentum",
        priorities: [
          "Take challenging courses",
          "Develop leadership in activities",
          "Start PSAT prep",
        ],
        recommendationTypes: ["program", "activity", "general"],
      };

    case "sophomore_winter":
      return {
        description: "Mid-year momentum",
        priorities: [
          "Maintain strong grades",
          "PSAT preparation",
          "Research summer opportunities",
        ],
        recommendationTypes: ["program", "activity", "general"],
      };

    case "sophomore_spring":
      return {
        description: "Strengthening profile",
        priorities: [
          "Plan for junior year courses",
          "Research summer programs",
          "Consider standardized testing timeline",
        ],
        recommendationTypes: ["program", "activity", "general"],
      };

    case "sophomore_summer":
      return {
        description: "Key summer for development",
        priorities: [
          "Competitive summer programs",
          "Research opportunities",
          "Test prep if needed",
        ],
        recommendationTypes: ["program", "activity", "general"],
      };

    case "junior_fall":
      return {
        description: "Critical junior year begins",
        priorities: [
          "Focus on grades",
          "Take SAT/ACT",
          "Research colleges",
          "Pursue leadership roles",
        ],
        recommendationTypes: ["school", "program", "activity", "general"],
      };

    case "junior_winter":
      return {
        description: "Junior year in full swing",
        priorities: [
          "Strong midterm grades",
          "Continue test prep",
          "Start college research",
          "Plan college visits",
        ],
        recommendationTypes: ["school", "program", "activity", "general"],
      };

    case "junior_spring":
      return {
        description: "Test season and college research",
        priorities: [
          "Complete standardized testing",
          "Build college list",
          "Plan summer before senior year",
          "Visit colleges if possible",
        ],
        recommendationTypes: ["school", "program", "activity", "general"],
      };

    case "junior_summer":
      return {
        description: "Final summer before applications",
        priorities: [
          "Meaningful summer experience",
          "Start essays",
          "Finalize college list",
          "Research schools in depth",
        ],
        recommendationTypes: ["school", "general"],
      };

    case "senior_fall":
      return {
        description: "Application season",
        priorities: [
          "Submit early applications",
          "Complete regular decision apps",
          "Maintain grades",
          "Request recommendations",
        ],
        recommendationTypes: ["school", "general"],
      };

    case "senior_winter":
      return {
        description: "Application wrap-up",
        priorities: [
          "Complete remaining applications",
          "Submit financial aid forms",
          "Keep grades up",
          "Wait for decisions",
        ],
        recommendationTypes: ["general"],
      };

    case "senior_spring":
      return {
        description: "Decision time",
        priorities: [
          "Compare offers",
          "Make final decision",
          "Handle waitlists",
          "Prepare for transition",
        ],
        recommendationTypes: ["general"],
      };

    default:
      return {
        description: "General guidance",
        priorities: [],
        recommendationTypes: ["school", "program", "activity", "general"],
      };
  }
}

/**
 * Checks if a recommendation type is relevant for the current stage
 */
export function isRecommendationTypeRelevant(
  type: "school" | "program" | "activity" | "general",
  stage: StageInfo
): boolean {
  return stage.recommendationTypes.includes(type);
}

/**
 * Gets the priority level for a recommendation type at the current stage
 * Higher number = higher priority
 */
export function getRecommendationTypePriority(
  type: "school" | "program" | "activity" | "general",
  stage: StageInfo
): number {
  const index = stage.recommendationTypes.indexOf(type);
  if (index === -1) return 0;
  // Earlier in the array = higher priority
  return stage.recommendationTypes.length - index;
}
