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
    "saveGpa",
    "saveTestScores",
    "addActivity",
    "addAward",
    "addCourse",
    "addProgram",
    "addSchoolToList",
    "saveProfileInfo",
    "addGoal",
  ]),
  args: z.record(z.string(), z.unknown()),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Widget type to display in the UI
 */
export const WidgetTypeSchema = z.enum([
  "gpa",
  "sat",
  "act",
  "activity",
  "award",
  "course",
  "program",
  "school",
  "profile",
  "goal",
]);

export type WidgetType = z.infer<typeof WidgetTypeSchema>;

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
  
  // Widget to show for confirmation
  widget: z.object({
    type: WidgetTypeSchema,
    data: z.record(z.string(), z.unknown()),
  }).optional(),
  
  // Any questions extracted from the user's message
  questions: z.array(z.string()).default([]),
  
  // Raw confidence score (0-1)
  confidence: z.number().min(0).max(1).default(0.8),
});

export type ParserResponse = z.infer<typeof ParserResponseSchema>;

/**
 * Context needed for parsing
 */
export interface ParserContext {
  studentName?: string;
  grade?: string;
  entryMode?: string;
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Map tool names to widget types
 */
export const toolToWidgetType: Record<string, WidgetType> = {
  saveGpa: "gpa",
  saveTestScores: "sat", // Will be refined based on args
  addActivity: "activity",
  addAward: "award",
  addCourse: "course",
  addProgram: "program",
  addSchoolToList: "school",
  saveProfileInfo: "profile",
  addGoal: "goal",
};
