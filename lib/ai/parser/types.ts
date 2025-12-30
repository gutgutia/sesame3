// =============================================================================
// PARSER TYPES
// =============================================================================

import { z } from "zod";

/**
 * Entity types that can be extracted from user messages
 */
export const EntityTypeSchema = z.enum([
  "test",      // SAT, ACT, PSAT, AP, Subject Tests
  "gpa",       // GPA scores
  "activity",  // Extracurriculars
  "award",     // Awards and honors
  "course",    // Classes
  "program",   // Summer programs, internships
  "school",    // College/university mentions
  "profile",   // Personal info (name, grade)
  "goal",      // Goals and plans
]);

export type EntityType = z.infer<typeof EntityTypeSchema>;

/**
 * A single extracted entity
 */
export const ExtractedEntitySchema = z.object({
  type: EntityTypeSchema,
  subtype: z.string().optional(), // e.g., "sat", "act" for test type
  value: z.union([z.string(), z.number(), z.boolean()]),
  details: z.record(z.string(), z.unknown()).optional(), // Additional parsed details
});

export type ExtractedEntity = z.infer<typeof ExtractedEntitySchema>;

/**
 * Intent types - what the user is trying to do
 */
export const IntentTypeSchema = z.enum([
  "profile_update",    // Adding/updating profile data
  "question_general",  // General question
  "question_chances",  // Asking about admission chances
  "question_schools",  // Asking about schools
  "question_strategy", // Asking for advice/strategy
  "greeting",          // Hello, hi, etc.
  "confirmation",      // Yes, okay, sure
  "rejection",         // No, not that, etc.
  "clarification",     // What do you mean, etc.
  "continuation",      // And also, plus, etc.
]);

export type IntentType = z.infer<typeof IntentTypeSchema>;

/**
 * Tool call to be executed
 */
export const ToolCallSchema = z.object({
  name: z.enum([
    // Onboarding tools - separate, lightweight
    "saveName",          // { firstName, lastName }
    "saveGrade",         // { grade }
    "saveHighSchool",    // { name, city?, state? }
    // Profile tools
    "saveGpa",
    "saveTestScores",
    "addActivity",
    "addAward",
    "addCourse",
    "addProgram",
    "addSchoolToList",
    "saveProfileInfo",   // Legacy combined profile tool
    "addGoal",
    "uploadTranscript",
  ]),
  args: z.record(z.string(), z.unknown()),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Widget type to display in the UI
 * Note: "gpa" removed (triggers transcript upload instead)
 * Note: "course" renamed to "transcript" (triggers transcript upload)
 */
export const WidgetTypeSchema = z.enum([
  // Onboarding micro-widgets - lightweight data capture
  "name",        // firstName, lastName with proper capitalization
  "grade",       // Grade selection (9th-12th, gap_year)
  "highschool",  // High school name, city, state
  // Input widgets - collect data from user
  "sat",
  "act",
  "activity",
  "award",
  "transcript",  // Replaces "course" - triggers transcript upload flow
  "program",
  "school",      // College/university for school list
  "profile",     // Legacy combined profile widget
  "goal",
  // Recommendation widgets - display-only, show suggestions
  "program_recommendations",  // Summer program suggestions
  "school_recommendations",   // College/university suggestions
]);

export type WidgetType = z.infer<typeof WidgetTypeSchema>;

/**
 * Single widget definition
 */
export const WidgetSchema = z.object({
  type: WidgetTypeSchema,
  data: z.record(z.string(), z.unknown()),
});

export type Widget = z.infer<typeof WidgetSchema>;

/**
 * Complete parser response
 */
export const ParserResponseSchema = z.object({
  // Extracted structured data
  entities: z.array(ExtractedEntitySchema).default([]),

  // What the user is trying to do
  intents: z.array(IntentTypeSchema).default([]),

  // Tool calls to execute
  tools: z.array(ToolCallSchema).default([]),

  // Quick acknowledgment (shown before Advisor response)
  acknowledgment: z.string().optional(),

  // Widgets to show for confirmation (supports multiple)
  widgets: z.array(WidgetSchema).default([]),

  // Legacy single widget (for backward compatibility, set to first widget)
  widget: WidgetSchema.optional(),

  // Any questions extracted from the user's message
  questions: z.array(z.string()).default([]),

  // Raw confidence score (0-1)
  confidence: z.number().min(0).max(1).default(0.8),
});

export type ParserResponse = z.infer<typeof ParserResponseSchema>;

/**
 * Context needed for parsing
 * Now includes full conversation history for secretary model
 */
export interface ParserContext {
  studentName?: string;
  grade?: string;
  entryMode?: string;
  // Full conversation history for context-aware parsing
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  // Legacy field - kept for backward compatibility
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Secretary model response - extends parser response with routing decision
 */
export const SecretaryResponseSchema = z.object({
  // === Routing Decision ===
  // Can Kimi handle this alone, or should we escalate to Claude?
  canHandle: z.boolean().default(false),

  // Why are we escalating? (only if canHandle is false)
  escalationReason: z.string().optional(),

  // === Kimi's Response (if handling) ===
  // The actual response to show the user (only if canHandle is true)
  response: z.string().optional(),

  // === Data Extraction (always populated) ===
  // Extracted structured data
  entities: z.array(ExtractedEntitySchema).default([]),

  // What the user is trying to do
  intents: z.array(IntentTypeSchema).default([]),

  // Tool calls to execute
  tools: z.array(ToolCallSchema).default([]),

  // Widgets to show for confirmation
  widgets: z.array(WidgetSchema).default([]),

  // Legacy single widget (for backward compatibility)
  widget: WidgetSchema.optional(),

  // Quick acknowledgment (legacy - now use response)
  acknowledgment: z.string().optional(),

  // Any questions extracted from the user's message
  questions: z.array(z.string()).default([]),

  // Raw confidence score (0-1)
  confidence: z.number().min(0).max(1).default(0.8),
});

export type SecretaryResponse = z.infer<typeof SecretaryResponseSchema>;

/**
 * Map tool names to widget types
 * Note: saveGpa now triggers transcript upload
 * Note: addCourse renamed to transcript upload
 */
export const toolToWidgetType: Record<string, WidgetType> = {
  // Onboarding micro-widgets
  saveName: "name",
  saveGrade: "grade",
  saveHighSchool: "highschool",
  // Standard widgets
  saveGpa: "transcript",        // GPA mention triggers transcript upload
  saveTestScores: "sat",        // Will be refined to "act" based on args
  addActivity: "activity",
  addAward: "award",
  addCourse: "transcript",      // Course mention triggers transcript upload
  uploadTranscript: "transcript", // Explicit transcript upload
  addProgram: "program",
  addSchoolToList: "school",
  saveProfileInfo: "profile",   // Legacy combined profile widget
  addGoal: "goal",
  // Recommendation tools
  recommendPrograms: "program_recommendations",
  recommendSchools: "school_recommendations",
};
