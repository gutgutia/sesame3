/**
 * Story Capture Prompts
 * 
 * Used for the "Share My Story" feature where students capture
 * meaningful personal narratives for their college profile.
 * 
 * FLOW:
 * 1. Simple opener + large text field for initial share
 * 2. AI responds with follow-up (if needed) or suggests saving
 * 3. User can continue OR save at any point
 * 4. AI synthesizes title/summary/themes on save
 */

// =============================================================================
// CONVERSATION SYSTEM PROMPT
// =============================================================================

/**
 * System prompt for the unified story capture experience.
 * 
 * Key behaviors:
 * - Warm, brief responses (1-2 sentences)
 * - Encourage depth without pressure
 * - Recognize when there's enough to save
 * - Never make the student feel they MUST continue
 */
export const STORY_CAPTURE_SYSTEM = `You are a warm, curious listener helping a high school student capture a personal story for their college profile.

## Your Role
- Listen actively and respond briefly (1-2 sentences)
- Ask ONE thoughtful follow-up question to go deeper
- Focus on the "why" - motivations, feelings, realizations
- Recognize when you have enough for a good story

## Response Format
Keep responses SHORT. After they share:
1. Acknowledge what they said (brief, genuine)
2. Ask ONE follow-up question OR suggest saving

## When to Suggest Saving
After 1-2 meaningful exchanges, if you have:
- What happened (the experience)
- Why it mattered (the meaning)
- How they felt or changed (the impact)

Then say something like: "This is a really meaningful story. Would you like to save it, or is there more you'd like to add?"

## Tone
- Friendly and casual, not formal
- Curious, not interrogating
- Brief - you're a listener, not a lecturer

## Don'ts
- Don't give advice or evaluate
- Don't write long responses
- Don't pressure them to continue
- Don't ask multiple questions at once`;

/**
 * Brief opening message for the story capture.
 */
export const STORY_OPENER = "Hey! What's on your mind today?";

/**
 * Placeholder for the initial text input.
 */
export const STORY_INPUT_PLACEHOLDER = `Share something meaningful to you...

It could be:
• A moment that shaped who you are
• Something you're passionate about
• A challenge you faced
• A person who influenced you

Write as much or as little as you'd like.`;

// =============================================================================
// SYNTHESIS
// =============================================================================

/**
 * Prompt to synthesize a story entry from the conversation.
 * 
 * Input: The raw content (conversation transcript)
 * Output: JSON with title, summary, and themes
 */
export function synthesizeStoryPrompt(rawContent: string, contentType: "conversation" | "note"): string {
  const contextNote = contentType === "conversation" 
    ? "This is a conversation where a student shared their story."
    : "This is a note the student wrote about themselves.";

  return `${contextNote}

---
${rawContent}
---

Based on this, generate:

1. **title**: A compelling 5-8 word title that captures the essence. Make it personal and specific.

2. **summary**: Write in FIRST PERSON ("I..." not "They...") from the student's perspective. Faithfully summarize everything meaningful they shared - do NOT limit to 2-3 sentences. If they shared a lot, write a proportionally longer summary that does justice to their story. Capture the key experiences, motivations, feelings, and what they learned.

3. **themes**: Select 2-4 themes from: Identity, Passion, Challenge, Growth, Leadership, Family, Community, Creativity, Discovery, Resilience

Return as JSON:
{
  "title": "...",
  "summary": "...",
  "themes": ["Theme1", "Theme2", ...]
}`;
}

// =============================================================================
// THEME DEFINITIONS
// =============================================================================

/**
 * Available themes for story categorization.
 */
export const STORY_THEMES = [
  "Identity",
  "Passion", 
  "Challenge",
  "Growth",
  "Leadership",
  "Family",
  "Community",
  "Creativity",
  "Discovery",
  "Resilience",
] as const;

export type StoryTheme = typeof STORY_THEMES[number];

// Legacy exports for backwards compatibility
export const QUICK_NOTE_PLACEHOLDER = STORY_INPUT_PLACEHOLDER;
export const STORY_CONVERSATION_OPENER = STORY_OPENER;
