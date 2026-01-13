// AI Tool Definitions
// Tools that the AI can call to interact with the user's profile

import { z } from "zod";

// =============================================================================
// TOOL SCHEMAS (without execute - handled client-side)
// =============================================================================

// GPA schema
const gpaSchema = z.object({
  gpaUnweighted: z.number().min(0).max(4.0).optional().describe("Unweighted GPA on 4.0 scale"),
  gpaWeighted: z.number().min(0).max(5.0).optional().describe("Weighted GPA (can be above 4.0)"),
  gpaScale: z.number().optional().describe("The scale used (usually 4.0 or 5.0)"),
});

// Test scores schema
const testScoresSchema = z.object({
  satTotal: z.number().min(400).max(1600).optional().describe("Total SAT score"),
  satMath: z.number().min(200).max(800).optional().describe("SAT Math section score"),
  satReading: z.number().min(200).max(800).optional().describe("SAT Reading/Writing section score"),
  actComposite: z.number().min(1).max(36).optional().describe("ACT composite score"),
  actEnglish: z.number().min(1).max(36).optional().describe("ACT English score"),
  actMath: z.number().min(1).max(36).optional().describe("ACT Math score"),
  actReading: z.number().min(1).max(36).optional().describe("ACT Reading score"),
  actScience: z.number().min(1).max(36).optional().describe("ACT Science score"),
  psatTotal: z.number().min(320).max(1520).optional().describe("PSAT/NMSQT total score"),
});

// AP score schema
const apScoreSchema = z.object({
  subject: z.string().describe("AP subject name (e.g., 'AP Computer Science A', 'AP Calculus BC')"),
  score: z.number().min(1).max(5).describe("AP exam score (1-5)"),
  year: z.number().optional().describe("Year the exam was taken"),
});

// Activity schema
const activitySchema = z.object({
  title: z.string().describe("Role or position (e.g., 'President', 'Member', 'Volunteer')"),
  organization: z.string().describe("Name of the club, team, or organization"),
  category: z.enum(["club", "sport", "arts", "volunteer", "work", "family", "other"]).optional(),
  isLeadership: z.boolean().optional().describe("Whether this is a leadership position"),
  description: z.string().optional().describe("Brief description of responsibilities and impact"),
  hoursPerWeek: z.number().optional().describe("Average hours per week"),
  yearsActive: z.string().optional().describe("Years involved, e.g., '9th-11th' or '2021-2023'"),
});

// Award schema
const awardSchema = z.object({
  title: z.string().describe("Name of the award (e.g., 'AIME Qualifier', 'National Merit Semifinalist')"),
  level: z.enum(["school", "regional", "state", "national", "international"]).describe("Recognition level"),
  organization: z.string().optional().describe("Awarding organization"),
  year: z.number().optional().describe("Year received"),
  description: z.string().optional().describe("Brief description of the achievement"),
});

// Course schema
const courseSchema = z.object({
  name: z.string().describe("Course name (e.g., 'AP Calculus BC')"),
  status: z.enum(["completed", "in_progress", "planned"]).describe("Whether the course is done, current, or future"),
  level: z.enum(["regular", "honors", "ap", "ib", "college", "other"]).optional(),
  subject: z.enum(["math", "science", "english", "history", "language", "arts", "other"]).optional(),
  grade: z.string().optional().describe("Letter grade if completed (A, A-, B+, etc.)"),
  gradeLevel: z.string().optional().describe("What grade they took/will take it (9th, 10th, 11th, 12th)"),
  academicYear: z.string().optional().describe("Academic year (e.g., '2023-2024')"),
  planningNotes: z.string().optional().describe("For planned courses, why they want to take it"),
});

// Program schema
const programSchema = z.object({
  name: z.string().describe("Program name (e.g., 'Stanford SIMR', 'RSI')"),
  organization: z.string().optional().describe("Host institution"),
  type: z.enum(["summer", "research", "internship", "online", "competition_prep", "other"]),
  status: z.enum(["interested", "applying", "applied", "accepted", "rejected", "waitlisted", "attending", "completed"]),
  year: z.number().optional().describe("Year of the program"),
  description: z.string().optional(),
});

// Profile info schema
const profileInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  preferredName: z.string().optional().describe("What they prefer to be called"),
  grade: z.enum(["9th", "10th", "11th", "12th", "gap_year"]).optional(),
  graduationYear: z.number().optional(),
  highSchoolName: z.string().optional(),
  highSchoolCity: z.string().optional(),
  highSchoolState: z.string().optional(),
});

// Goal schema
const goalSchema = z.object({
  title: z.string().describe("Goal title"),
  category: z.enum(["research", "competition", "leadership", "project", "academic", "application", "other"]),
  description: z.string().optional(),
  targetDate: z.string().optional().describe("Target completion date (ISO format)"),
  priority: z.enum(["high", "medium", "low"]).optional(),
  impactDescription: z.string().optional().describe("How this helps their college application"),
});

// School schema
const schoolSchema = z.object({
  schoolName: z.string().describe("Full name of the college/university"),
  tier: z.enum(["dream", "reach", "target", "safety"]).describe("How realistic is admission"),
  interestLevel: z.enum(["high", "medium", "low", "uncertain"]).optional(),
  applicationType: z.enum(["ed", "ed2", "ea", "rea", "rd"]).optional(),
  whyInterested: z.string().optional().describe("Why they're interested in this school"),
});

// =============================================================================
// PROFILE DATA TOOLS
// =============================================================================

export const profileTools = {
  saveGpa: {
    description: "Save or update the student's GPA. Call this when the student mentions their GPA.",
    inputSchema: gpaSchema,
  },

  saveTestScores: {
    description: "Save or update standardized test scores. Call this when the student mentions SAT, ACT, or PSAT scores.",
    inputSchema: testScoresSchema,
  },

  saveAPScore: {
    description: "Save an AP exam score. Call this when the student mentions an AP exam score (e.g., 'I got a 5 on AP CS', 'AP Calc BC score was 4').",
    inputSchema: apScoreSchema,
  },

  addActivity: {
    description: "Add an extracurricular activity. Call this when the student mentions a club, sport, job, volunteer work, or other activity.",
    inputSchema: activitySchema,
  },
  
  addAward: {
    description: "Add an honor or award. Call this when the student mentions competitions, recognition, or achievements.",
    inputSchema: awardSchema,
  },
  
  addCourse: {
    description: "Add a course to the student's academic record. Courses can be completed, in-progress, or planned.",
    inputSchema: courseSchema,
  },
  
  addProgram: {
    description: "Add a summer program, research opportunity, or internship.",
    inputSchema: programSchema,
  },
  
  saveProfileInfo: {
    description: "Save basic profile information like name, grade, or high school.",
    inputSchema: profileInfoSchema,
  },
};

// =============================================================================
// PLANNING TOOLS
// =============================================================================

export const planningTools = {
  addGoal: {
    description: "Create a new goal for the student to work towards.",
    inputSchema: goalSchema,
  },

  addSchoolToList: {
    description: "Add a college to the student's school list.",
    inputSchema: schoolSchema,
  },
};

// =============================================================================
// RECOMMENDATION TOOLS
// =============================================================================

// School recommendations schema
const schoolRecommendationsSchema = z.object({
  schools: z.array(z.string()).describe("List of specific school names to recommend (e.g., ['MIT', 'Stanford', 'Carnegie Mellon'])"),
  reason: z.string().optional().describe("Brief explanation of why these schools are a good fit"),
});

// Program recommendations schema
const programRecommendationsSchema = z.object({
  programs: z.array(z.string()).describe("List of specific program names to recommend (e.g., ['RSI', 'MITES', 'Stanford SIMR'])"),
  reason: z.string().optional().describe("Brief explanation of why these programs are relevant"),
});

export const recommendationTools = {
  showSchoolRecommendations: {
    description: "Show a carousel of recommended colleges/universities. Call this when the student asks about what schools to apply to, wants school suggestions, or when you want to proactively suggest schools based on their profile and interests. Provide specific school names that match their profile.",
    inputSchema: schoolRecommendationsSchema,
  },

  showProgramRecommendations: {
    description: "Show a carousel of recommended summer programs, research opportunities, or internships. Call this when the student asks about programs to apply to, wants suggestions for summer activities, or when you want to proactively suggest programs. Provide specific program names.",
    inputSchema: programRecommendationsSchema,
  },
};

// =============================================================================
// ALL TOOLS COMBINED
// =============================================================================

export const allTools = {
  ...profileTools,
  ...planningTools,
  ...recommendationTools,
};

// Type for tool names
export type ToolName = keyof typeof allTools;

// Helper to get widget type from tool name
export function getWidgetTypeFromToolName(toolName: string): string | null {
  const mapping: Record<string, string> = {
    saveGpa: "transcript",          // GPA mention triggers transcript upload
    saveTestScores: "sat",
    saveAPScore: "ap",              // AP exam scores
    addActivity: "activity",
    addAward: "award",
    addCourse: "transcript",        // Course mention triggers transcript upload
    addProgram: "program",
    saveProfileInfo: "profile",
    addGoal: "goal",
    addSchoolToList: "school",
    showSchoolRecommendations: "school_recommendations",
    showProgramRecommendations: "program_recommendations",
  };

  return mapping[toolName] || null;
}

// Check if a tool is a recommendation tool (requires special handling)
export function isRecommendationTool(toolName: string): boolean {
  return toolName === "showSchoolRecommendations" || toolName === "showProgramRecommendations";
}
