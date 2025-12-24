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
  STORY_CONVERSATION_OPENER,
  shouldWrapUpPrompt,
  synthesizeStoryPrompt,
  QUICK_NOTE_PLACEHOLDER,
  STORY_THEMES,
  type StoryTheme,
} from "./story";

// Data extraction prompts
export {
  TRANSCRIPT_EXTRACTION_PROMPT,
} from "./extraction";

