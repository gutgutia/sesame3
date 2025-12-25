/**
 * Centralized Prompts Export
 * 
 * All AI prompts used in the application should be imported from here.
 * 
 * @example
 * import { STORY_CAPTURE_SYSTEM, synthesizeStoryPrompt } from "@/lib/prompts";
 */

// Story capture prompts
export {
  STORY_CAPTURE_SYSTEM,
  STORY_OPENER,
  STORY_INPUT_PLACEHOLDER,
  synthesizeStoryPrompt,
  STORY_THEMES,
  type StoryTheme,
  // Legacy aliases
  QUICK_NOTE_PLACEHOLDER,
  STORY_CONVERSATION_OPENER,
} from "./story";

// Data extraction prompts
export {
  TRANSCRIPT_EXTRACTION_PROMPT,
} from "./extraction";
