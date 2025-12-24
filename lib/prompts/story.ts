/**
 * Story Capture Prompts
 * 
 * Used for the "Share My Story" feature where students capture
 * meaningful personal narratives for their college profile.
 */

// =============================================================================
// CONVERSATION MODE
// =============================================================================

/**
 * System prompt for the story capture conversation.
 * 
 * Goal: Help students articulate meaningful personal stories through
 * a warm, conversational exchange (3-5 turns).
 */
export const STORY_CAPTURE_SYSTEM = `You are helping a high school student capture a meaningful personal story for their college profile.

## Your Goal
Help them articulate something meaningful about themselves - an experience, passion, challenge, or insight that reveals who they are.

## Your Approach
- Be warm, curious, and encouraging
- Ask thoughtful follow-up questions to go deeper
- Focus on the "why" behind their experiences
- Extract specific details: names, moments, feelings, realizations
- Keep the conversation focused on ONE story (don't branch to multiple topics)

## Conversation Flow
1. If they haven't shared anything yet, ask an open-ended question
2. After they share, ask 2-3 follow-up questions to understand:
   - What motivated them
   - How they felt in key moments
   - What they learned or how they changed
3. After 3-5 exchanges, gently wrap up: "I think I have a good picture of this story. Would you like to save it?"

## What NOT to do
- Don't give advice or evaluate their story
- Don't be interview-like or clinical
- Don't ask about multiple unrelated topics
- Don't rush - let the story unfold naturally
- Don't judge - every story has value

## Tone
Imagine you're a trusted mentor having coffee with the student. Be genuine, interested, and supportive.`;

/**
 * Opening message when the student hasn't said anything yet.
 */
export const STORY_CONVERSATION_OPENER = `I'd love to learn more about you beyond grades and test scores. 

What's something you're passionate about, or an experience that shaped who you are? It could be anything - big or small.`;

/**
 * Prompt to determine if the conversation has enough content to wrap up.
 */
export function shouldWrapUpPrompt(conversationSoFar: string): string {
  return `Based on this conversation about a student's personal story:

${conversationSoFar}

Has the student shared enough meaningful detail that we could write a good summary? Consider:
- Do we know what happened?
- Do we understand why it mattered to them?
- Do we have specific details (not just generalizations)?

Respond with JSON: { "ready": true/false, "reason": "brief explanation" }`;
}

// =============================================================================
// SYNTHESIS
// =============================================================================

/**
 * Prompt to synthesize a story entry from conversation or note.
 * 
 * Input: The raw content (conversation transcript or note text)
 * Output: JSON with title, summary, and themes
 */
export function synthesizeStoryPrompt(rawContent: string, contentType: "conversation" | "note"): string {
  const contextNote = contentType === "conversation" 
    ? "This is a transcript of a conversation where a student shared their story."
    : "This is a note the student wrote about themselves.";

  return `${contextNote}

---
${rawContent}
---

Based on this, generate:

1. **title**: A compelling 5-8 word title that captures the essence of their story. Make it personal and specific, not generic.

2. **summary**: 2-3 sentences summarizing the story in third person ("They..." not "I..."). Capture the key experience and what it reveals about them.

3. **themes**: Select 2-4 themes that best fit this story from the following list:
   - Identity (who they are, cultural background, values)
   - Passion (deep interests, what excites them)
   - Challenge (obstacles overcome, difficult experiences)
   - Growth (personal development, learning moments)
   - Leadership (guiding others, taking initiative)
   - Family (family relationships, heritage)
   - Community (helping others, social impact)
   - Creativity (artistic expression, innovation)
   - Discovery (intellectual curiosity, exploration)
   - Resilience (bouncing back, perseverance)

Return as JSON:
{
  "title": "...",
  "summary": "...",
  "themes": ["Theme1", "Theme2", ...]
}`;
}

// =============================================================================
// QUICK NOTE MODE
// =============================================================================

/**
 * Placeholder text for the quick note textarea.
 */
export const QUICK_NOTE_PLACEHOLDER = `Write about something meaningful to you...

Some ideas:
• A moment that changed how you see the world
• Something you're passionate about and why
• A challenge you overcame
• A person who shaped who you are`;

// =============================================================================
// THEME DEFINITIONS
// =============================================================================

/**
 * Available themes for story categorization.
 * These should match what's used in the synthesis prompt.
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

