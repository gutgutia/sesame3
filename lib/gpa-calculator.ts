/**
 * GPA Calculator
 * 
 * Calculates weighted and unweighted GPA from course data.
 * 
 * Weighting:
 * - Regular: +0.0
 * - Honors: +0.5
 * - AP/IB/College: +1.0
 */

export interface CourseForGPA {
  grade?: string | null;
  gradeNumeric?: number | null;
  level?: string | null;
  credits?: number | null;
  status?: string | null;
}

// Grade to numeric value mapping
const GRADE_VALUES: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,
};

// Weight additions for different course levels
const LEVEL_WEIGHTS: Record<string, number> = {
  regular: 0.0,
  honors: 0.5,
  ap: 1.0,
  ib: 1.0,
  college: 1.0,
  other: 0.0,
};

export interface GPAResult {
  unweighted: number | null;
  weighted: number | null;
  totalCredits: number;
  courseCount: number;
  apCount: number;
  honorsCount: number;
  regularCount: number;
}

/**
 * Calculate GPA from a list of courses
 */
export function calculateGPA(courses: CourseForGPA[]): GPAResult {
  // Only include completed courses with grades
  const gradedCourses = courses.filter(
    (c) => c.status === "completed" && (c.gradeNumeric != null || c.grade)
  );

  if (gradedCourses.length === 0) {
    return {
      unweighted: null,
      weighted: null,
      totalCredits: 0,
      courseCount: 0,
      apCount: 0,
      honorsCount: 0,
      regularCount: 0,
    };
  }

  let unweightedSum = 0;
  let weightedSum = 0;
  let totalCredits = 0;
  let apCount = 0;
  let honorsCount = 0;
  let regularCount = 0;

  for (const course of gradedCourses) {
    // Get numeric grade value
    const gradeValue = course.gradeNumeric ?? GRADE_VALUES[course.grade || ""] ?? null;
    if (gradeValue === null) continue;

    // Get credits (default to 1)
    const credits = course.credits ?? 1;
    
    // Get level weight
    const level = course.level?.toLowerCase() || "regular";
    const levelWeight = LEVEL_WEIGHTS[level] ?? 0;

    // Count course types
    if (level === "ap" || level === "ib" || level === "college") {
      apCount++;
    } else if (level === "honors") {
      honorsCount++;
    } else {
      regularCount++;
    }

    // Add to sums
    unweightedSum += gradeValue * credits;
    weightedSum += (gradeValue + levelWeight) * credits;
    totalCredits += credits;
  }

  return {
    unweighted: totalCredits > 0 ? Math.round((unweightedSum / totalCredits) * 100) / 100 : null,
    weighted: totalCredits > 0 ? Math.round((weightedSum / totalCredits) * 100) / 100 : null,
    totalCredits,
    courseCount: gradedCourses.length,
    apCount,
    honorsCount,
    regularCount,
  };
}

/**
 * Format GPA for display
 */
export function formatGPA(gpa: number | null): string {
  if (gpa === null) return "—";
  return gpa.toFixed(2);
}

