/**
 * Eligibility calculation for summer programs
 *
 * Checks whether a student meets the eligibility requirements for a program
 * based on their profile data.
 */

export type EligibilityStatus = "eligible" | "ineligible" | "unknown" | "check_required";

export interface EligibilityCheck {
  criterion: string;
  status: EligibilityStatus;
  message: string;
  details?: string;
}

export interface EligibilityResult {
  overall: EligibilityStatus;
  checks: EligibilityCheck[];
  summary: string;
}

interface StudentProfile {
  birthDate?: string | Date | null;
  residencyStatus?: string | null;
  grade?: string | null;
  graduationYear?: number | null;
  academics?: {
    schoolReportedGpaUnweighted?: number | null;
    schoolReportedGpaWeighted?: number | null;
  } | null;
  courses?: Array<{
    name: string;
    status: string;
    level?: string | null;
  }>;
}

interface SummerProgram {
  programYear: number;
  minGrade?: number | null;
  maxGrade?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  minGpaUnweighted?: number | null;
  minGpaWeighted?: number | null;
  citizenship?: string | null;
  requiredCourses?: string[];
  eligibilityNotes?: string | null;
}

/**
 * Calculate the student's age at a given date
 */
function calculateAgeAtDate(birthDate: Date, targetDate: Date): number {
  let age = targetDate.getFullYear() - birthDate.getFullYear();
  const monthDiff = targetDate.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && targetDate.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Parse grade string to number (e.g., "10th" -> 10)
 */
function parseGrade(grade: string | null | undefined): number | null {
  if (!grade) return null;
  const match = grade.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Get the grade the student will be in during the program
 * If it's a summer program, they're typically "rising" to the next grade
 */
function getGradeForProgram(currentGrade: string | null | undefined, programYear: number): number | null {
  const gradeNum = parseGrade(currentGrade);
  if (gradeNum === null) return null;

  // For summer programs, students are usually applying as "rising" grade
  // e.g., a current 10th grader applying for Summer 2025 is a "rising junior"
  // Programs often specify grade in terms of the grade they'll be entering
  // We'll return the current grade, and the program's minGrade/maxGrade should be interpreted accordingly
  return gradeNum;
}

/**
 * Check if student's residency meets citizenship requirement
 */
function checkCitizenship(studentStatus: string | null | undefined, requirement: string | null | undefined): EligibilityCheck {
  if (!requirement || requirement === "international_ok") {
    return {
      criterion: "Citizenship",
      status: "eligible",
      message: "Open to all students",
    };
  }

  if (!studentStatus) {
    return {
      criterion: "Citizenship",
      status: "unknown",
      message: "Residency status not set",
      details: "Update your profile to check eligibility",
    };
  }

  if (requirement === "us_only") {
    if (studentStatus === "us_citizen") {
      return {
        criterion: "Citizenship",
        status: "eligible",
        message: "U.S. Citizen",
      };
    } else {
      return {
        criterion: "Citizenship",
        status: "ineligible",
        message: "U.S. Citizens only",
        details: "This program is only open to U.S. Citizens",
      };
    }
  }

  if (requirement === "us_permanent_resident") {
    if (studentStatus === "us_citizen" || studentStatus === "us_permanent_resident") {
      return {
        criterion: "Citizenship",
        status: "eligible",
        message: studentStatus === "us_citizen" ? "U.S. Citizen" : "U.S. Permanent Resident",
      };
    } else {
      return {
        criterion: "Citizenship",
        status: "ineligible",
        message: "U.S. Citizens or Permanent Residents only",
        details: "This program requires U.S. citizenship or permanent residency",
      };
    }
  }

  return {
    criterion: "Citizenship",
    status: "eligible",
    message: "Citizenship requirement met",
  };
}

/**
 * Calculate full eligibility for a student and program
 */
export function calculateEligibility(
  student: StudentProfile,
  program: SummerProgram
): EligibilityResult {
  const checks: EligibilityCheck[] = [];

  // 1. Age check
  if (program.minAge || program.maxAge) {
    if (!student.birthDate) {
      checks.push({
        criterion: "Age",
        status: "unknown",
        message: "Date of birth not set",
        details: "Update your profile to check age eligibility",
      });
    } else {
      const birthDate = new Date(student.birthDate);
      // Default to June 1 of program year for age calculation
      const referenceDate = new Date(program.programYear, 5, 1); // June 1

      const age = calculateAgeAtDate(birthDate, referenceDate);

      let ageEligible = true;
      let ageMessage = `${age} years old at program start`;

      if (program.minAge && age < program.minAge) {
        ageEligible = false;
        ageMessage = `Must be at least ${program.minAge} (you'll be ${age})`;
      } else if (program.maxAge && age > program.maxAge) {
        ageEligible = false;
        ageMessage = `Must be ${program.maxAge} or younger (you'll be ${age})`;
      }

      checks.push({
        criterion: "Age",
        status: ageEligible ? "eligible" : "ineligible",
        message: ageMessage,
        details: ageEligible ? undefined : `Program requires age ${program.minAge || "any"}-${program.maxAge || "any"}`,
      });
    }
  }

  // 2. Grade check
  if (program.minGrade || program.maxGrade) {
    const studentGrade = getGradeForProgram(student.grade, program.programYear);

    if (studentGrade === null) {
      checks.push({
        criterion: "Grade",
        status: "unknown",
        message: "Grade not set",
        details: "Update your profile to check grade eligibility",
      });
    } else {
      let gradeEligible = true;
      let gradeMessage = `Grade ${studentGrade}`;

      // Note: For summer programs, students often apply as "rising" to next grade
      // The program's minGrade/maxGrade typically refers to the grade during the program
      // A 10th grader in spring would be "rising 11th" for a summer program
      const risingGrade = studentGrade + 1;

      if (program.minGrade && risingGrade < program.minGrade) {
        gradeEligible = false;
        gradeMessage = `Rising grade ${risingGrade} (requires ${program.minGrade}+)`;
      } else if (program.maxGrade && risingGrade > program.maxGrade) {
        gradeEligible = false;
        gradeMessage = `Rising grade ${risingGrade} (max grade ${program.maxGrade})`;
      } else {
        gradeMessage = `Rising grade ${risingGrade}`;
      }

      checks.push({
        criterion: "Grade",
        status: gradeEligible ? "eligible" : "ineligible",
        message: gradeMessage,
        details: gradeEligible
          ? undefined
          : `Program is for grades ${program.minGrade || "any"}-${program.maxGrade || "any"}`,
      });
    }
  }

  // 3. Citizenship check
  if (program.citizenship) {
    checks.push(checkCitizenship(student.residencyStatus, program.citizenship));
  }

  // 4. GPA check
  if (program.minGpaUnweighted || program.minGpaWeighted) {
    const studentGpaUW = student.academics?.schoolReportedGpaUnweighted;
    const studentGpaW = student.academics?.schoolReportedGpaWeighted;

    if (!studentGpaUW && !studentGpaW) {
      checks.push({
        criterion: "GPA",
        status: "unknown",
        message: "GPA not set",
        details: "Update your academics to check GPA eligibility",
      });
    } else {
      let gpaEligible = true;
      let gpaMessage = "";

      if (program.minGpaUnweighted && studentGpaUW) {
        if (studentGpaUW < program.minGpaUnweighted) {
          gpaEligible = false;
          gpaMessage = `Unweighted GPA ${studentGpaUW} (requires ${program.minGpaUnweighted}+)`;
        } else {
          gpaMessage = `Unweighted GPA ${studentGpaUW}`;
        }
      }

      if (program.minGpaWeighted && studentGpaW) {
        if (studentGpaW < program.minGpaWeighted) {
          gpaEligible = false;
          gpaMessage = `Weighted GPA ${studentGpaW} (requires ${program.minGpaWeighted}+)`;
        } else {
          gpaMessage = gpaMessage || `Weighted GPA ${studentGpaW}`;
        }
      }

      checks.push({
        criterion: "GPA",
        status: gpaEligible ? "eligible" : "ineligible",
        message: gpaMessage || "GPA requirement met",
      });
    }
  }

  // 5. Required courses check
  if (program.requiredCourses && program.requiredCourses.length > 0) {
    if (!student.courses || student.courses.length === 0) {
      checks.push({
        criterion: "Courses",
        status: "check_required",
        message: `Required: ${program.requiredCourses.join(", ")}`,
        details: "Add your courses to check prerequisites",
      });
    } else {
      // Simple check: see if any student courses match required courses
      // This is a fuzzy match - could be improved with better course name matching
      const completedCourses = student.courses
        .filter(c => c.status === "completed" || c.status === "in_progress")
        .map(c => c.name.toLowerCase());

      const missingCourses = program.requiredCourses.filter(
        req => !completedCourses.some(c => c.includes(req.toLowerCase()) || req.toLowerCase().includes(c))
      );

      if (missingCourses.length === 0) {
        checks.push({
          criterion: "Courses",
          status: "eligible",
          message: "Prerequisites met",
        });
      } else {
        checks.push({
          criterion: "Courses",
          status: "check_required",
          message: `May need: ${missingCourses.join(", ")}`,
          details: "Review your courses against requirements",
        });
      }
    }
  }

  // 6. Eligibility notes (complex requirements that need manual review)
  if (program.eligibilityNotes) {
    checks.push({
      criterion: "Other Requirements",
      status: "check_required",
      message: "Additional eligibility requirements apply",
      details: program.eligibilityNotes,
    });
  }

  // Calculate overall status
  const hasIneligible = checks.some(c => c.status === "ineligible");
  const hasUnknown = checks.some(c => c.status === "unknown");
  const hasCheckRequired = checks.some(c => c.status === "check_required");

  let overall: EligibilityStatus;
  let summary: string;

  if (hasIneligible) {
    overall = "ineligible";
    const ineligibleReasons = checks.filter(c => c.status === "ineligible").map(c => c.criterion);
    summary = `Not eligible: ${ineligibleReasons.join(", ")}`;
  } else if (hasUnknown) {
    overall = "unknown";
    summary = "Complete your profile to check eligibility";
  } else if (hasCheckRequired) {
    overall = "check_required";
    summary = "Some requirements need manual review";
  } else if (checks.length === 0) {
    overall = "eligible";
    summary = "No specific requirements listed";
  } else {
    overall = "eligible";
    summary = "Meets all requirements";
  }

  return {
    overall,
    checks,
    summary,
  };
}

/**
 * Format eligibility result for display
 */
export function getEligibilityBadge(status: EligibilityStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case "eligible":
      return { label: "Eligible", color: "text-green-700", bgColor: "bg-green-100" };
    case "ineligible":
      return { label: "Not Eligible", color: "text-red-700", bgColor: "bg-red-100" };
    case "check_required":
      return { label: "Review Required", color: "text-yellow-700", bgColor: "bg-yellow-100" };
    case "unknown":
    default:
      return { label: "Check Eligibility", color: "text-gray-700", bgColor: "bg-gray-100" };
  }
}
