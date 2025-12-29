import { describe, it, expect } from "vitest";
import { calculateGPA, formatGPA, type CourseForGPA } from "@/lib/gpa-calculator";

describe("GPA Calculator", () => {
  describe("calculateGPA", () => {
    it("should return null GPA for empty course list", () => {
      const result = calculateGPA([]);

      expect(result.unweighted).toBeNull();
      expect(result.weighted).toBeNull();
      expect(result.courseCount).toBe(0);
      expect(result.totalCredits).toBe(0);
    });

    it("should return null GPA when no courses are completed", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "regular", status: "in_progress" },
        { grade: "B", level: "ap", status: "planned" },
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBeNull();
      expect(result.weighted).toBeNull();
      expect(result.courseCount).toBe(0);
    });

    it("should calculate unweighted GPA correctly for regular courses", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "regular", status: "completed" },  // 4.0
        { grade: "B", level: "regular", status: "completed" },  // 3.0
        { grade: "A-", level: "regular", status: "completed" }, // 3.7
      ];

      const result = calculateGPA(courses);

      // (4.0 + 3.0 + 3.7) / 3 = 3.566... → 3.57
      expect(result.unweighted).toBe(3.57);
      expect(result.weighted).toBe(3.57); // Same as unweighted for regular courses
      expect(result.courseCount).toBe(3);
      expect(result.regularCount).toBe(3);
      expect(result.apCount).toBe(0);
      expect(result.honorsCount).toBe(0);
    });

    it("should add +0.5 weight for honors courses", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "honors", status: "completed" }, // 4.0 unweighted, 4.5 weighted
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(4.0);
      expect(result.weighted).toBe(4.5);
      expect(result.honorsCount).toBe(1);
    });

    it("should add +1.0 weight for AP courses", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "ap", status: "completed" }, // 4.0 unweighted, 5.0 weighted
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(4.0);
      expect(result.weighted).toBe(5.0);
      expect(result.apCount).toBe(1);
    });

    it("should add +1.0 weight for IB courses", () => {
      const courses: CourseForGPA[] = [
        { grade: "B+", level: "ib", status: "completed" }, // 3.3 unweighted, 4.3 weighted
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(3.3);
      expect(result.weighted).toBe(4.3);
      expect(result.apCount).toBe(1); // IB counted with AP
    });

    it("should add +1.0 weight for college courses", () => {
      const courses: CourseForGPA[] = [
        { grade: "A-", level: "college", status: "completed" }, // 3.7 unweighted, 4.7 weighted
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(3.7);
      expect(result.weighted).toBe(4.7);
      expect(result.apCount).toBe(1); // College counted with AP
    });

    it("should calculate mixed course levels correctly", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "regular", status: "completed" }, // 4.0 / 4.0
        { grade: "A", level: "honors", status: "completed" },  // 4.0 / 4.5
        { grade: "A", level: "ap", status: "completed" },      // 4.0 / 5.0
      ];

      const result = calculateGPA(courses);

      // Unweighted: (4.0 + 4.0 + 4.0) / 3 = 4.0
      expect(result.unweighted).toBe(4.0);
      // Weighted: (4.0 + 4.5 + 5.0) / 3 = 4.5
      expect(result.weighted).toBe(4.5);
      expect(result.regularCount).toBe(1);
      expect(result.honorsCount).toBe(1);
      expect(result.apCount).toBe(1);
    });

    it("should handle all letter grades correctly", () => {
      const gradeTests: Array<{ grade: string; expected: number }> = [
        { grade: "A+", expected: 4.0 },
        { grade: "A", expected: 4.0 },
        { grade: "A-", expected: 3.7 },
        { grade: "B+", expected: 3.3 },
        { grade: "B", expected: 3.0 },
        { grade: "B-", expected: 2.7 },
        { grade: "C+", expected: 2.3 },
        { grade: "C", expected: 2.0 },
        { grade: "C-", expected: 1.7 },
        { grade: "D+", expected: 1.3 },
        { grade: "D", expected: 1.0 },
        { grade: "D-", expected: 0.7 },
        { grade: "F", expected: 0.0 },
      ];

      for (const { grade, expected } of gradeTests) {
        const courses: CourseForGPA[] = [
          { grade, level: "regular", status: "completed" },
        ];
        const result = calculateGPA(courses);
        expect(result.unweighted).toBe(expected);
      }
    });

    it("should use gradeNumeric when provided", () => {
      const courses: CourseForGPA[] = [
        { gradeNumeric: 3.85, level: "regular", status: "completed" },
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(3.85);
    });

    it("should prefer gradeNumeric over grade string", () => {
      const courses: CourseForGPA[] = [
        { grade: "B", gradeNumeric: 3.95, level: "regular", status: "completed" },
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(3.95); // Uses gradeNumeric, not "B" (3.0)
    });

    it("should respect credits when calculating GPA", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "regular", status: "completed", credits: 1 },  // 4.0 * 1
        { grade: "B", level: "regular", status: "completed", credits: 3 },  // 3.0 * 3
      ];

      const result = calculateGPA(courses);

      // (4.0 * 1 + 3.0 * 3) / (1 + 3) = (4 + 9) / 4 = 3.25
      expect(result.unweighted).toBe(3.25);
      expect(result.totalCredits).toBe(4);
    });

    it("should default to 1 credit when not specified", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "regular", status: "completed" },
        { grade: "B", level: "regular", status: "completed" },
      ];

      const result = calculateGPA(courses);

      expect(result.totalCredits).toBe(2);
    });

    it("should ignore courses with no grade", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "regular", status: "completed" },
        { grade: null, level: "regular", status: "completed" },
        { level: "regular", status: "completed" }, // No grade at all
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(4.0);
      expect(result.courseCount).toBe(1);
    });

    it("should handle case-insensitive level matching", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "AP", status: "completed" },
        { grade: "A", level: "Honors", status: "completed" },
        { grade: "A", level: "REGULAR", status: "completed" },
      ];

      const result = calculateGPA(courses);

      expect(result.apCount).toBe(1);
      expect(result.honorsCount).toBe(1);
      expect(result.regularCount).toBe(1);
    });

    it("should treat unknown levels as regular", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "unknown_level", status: "completed" },
        { grade: "A", level: "other", status: "completed" },
      ];

      const result = calculateGPA(courses);

      expect(result.weighted).toBe(4.0); // No weight added
      expect(result.regularCount).toBe(2);
    });

    // Real-world test case: High achiever profile from seed
    it("should calculate high achiever profile correctly", () => {
      const courses: CourseForGPA[] = [
        { grade: "A", level: "ap", status: "completed" },      // AP Calculus BC
        { grade: "A", level: "ap", status: "completed" },      // AP Physics C
        { grade: "A", level: "ap", status: "completed" },      // AP Chemistry
        { grade: "A", level: "ap", status: "completed" },      // AP CS A
        { grade: "A", level: "ap", status: "completed" },      // AP US History
        { grade: "A", level: "college", status: "completed" }, // Multivariable Calc (in progress becomes completed)
      ];

      const result = calculateGPA(courses);

      expect(result.unweighted).toBe(4.0);
      expect(result.weighted).toBe(5.0);
      expect(result.apCount).toBe(6);
      expect(result.courseCount).toBe(6);
    });

    // Real-world test case: Average student profile
    it("should calculate average student profile correctly", () => {
      const courses: CourseForGPA[] = [
        { grade: "B+", level: "honors", status: "completed" }, // Pre-Calc
        { grade: "B", level: "honors", status: "completed" },  // Chemistry
        { grade: "A-", level: "honors", status: "completed" }, // English 10
        { grade: "B+", level: "ap", status: "completed" },     // APUSH
      ];

      const result = calculateGPA(courses);

      // Unweighted: (3.3 + 3.0 + 3.7 + 3.3) / 4 = 3.325 → 3.33
      expect(result.unweighted).toBe(3.33);
      // Weighted: (3.8 + 3.5 + 4.2 + 4.3) / 4 = 3.95
      expect(result.weighted).toBe(3.95);
    });
  });

  describe("formatGPA", () => {
    it("should format GPA with 2 decimal places", () => {
      expect(formatGPA(4.0)).toBe("4.00");
      expect(formatGPA(3.567)).toBe("3.57");
      expect(formatGPA(3.5)).toBe("3.50");
    });

    it("should return dash for null GPA", () => {
      expect(formatGPA(null)).toBe("—");
    });

    it("should handle zero GPA", () => {
      expect(formatGPA(0)).toBe("0.00");
    });
  });
});
