// =============================================================================
// CONVERSATION SUMMARY
// =============================================================================

/**
 * Loads and formats the master summary for the advisor context.
 * This gives the advisor full awareness of past conversations.
 *
 * Master summary sections:
 * - quickContext: Fast refresher (~100 tokens)
 * - recentSessions: Last 2-3 conversations (~300 tokens)
 * - studentUnderstanding: AI's understanding of the student (~200 tokens)
 * - openCommitments: Active action items (~100 tokens)
 *
 * Token budget: ~700 tokens total
 */

import { prisma } from "@/lib/db";

export type ConversationSummaryParams = {
  profileId: string;
};

export async function buildConversationSummary(
  params: ConversationSummaryParams
): Promise<string> {
  const { profileId } = params;

  try {
    // Load master summary from StudentContext
    const context = await prisma.studentContext.findUnique({
      where: { studentProfileId: profileId },
      select: {
        quickContext: true,
        recentSessions: true,
        studentUnderstanding: true,
        openCommitments: true,
        advisorPreferences: true,
        accountabilityLevel: true,
        masterSummaryUpdatedAt: true,
        totalConversations: true,
      },
    });

    // No context yet - this is a new student
    if (!context || !context.masterSummaryUpdatedAt) {
      return buildFirstConversationContext();
    }

    // Build the full master summary
    const sections: string[] = [];

    // Quick Context - always include
    if (context.quickContext) {
      sections.push(`## Student At-a-Glance\n${context.quickContext}`);
    }

    // Recent Sessions - key for continuity
    if (context.recentSessions) {
      sections.push(`## Recent Sessions\n${context.recentSessions}`);
    }

    // Student Understanding - personality, strengths, challenges
    if (context.studentUnderstanding) {
      sections.push(`## Your Understanding of This Student\n${context.studentUnderstanding}`);
    }

    // Open Commitments - action items and follow-ups
    if (context.openCommitments) {
      sections.push(`## Open Commitments\n${context.openCommitments}`);
    }

    // Advisor Preferences - how the student wants to be coached
    if (context.advisorPreferences || context.accountabilityLevel !== "moderate") {
      const prefs = buildAdvisorPreferencesSection(
        context.advisorPreferences,
        context.accountabilityLevel
      );
      if (prefs) {
        sections.push(prefs);
      }
    }

    if (sections.length === 0) {
      return buildFirstConversationContext();
    }

    // Add meta info
    const daysSinceUpdate = context.masterSummaryUpdatedAt
      ? Math.floor(
          (Date.now() - new Date(context.masterSummaryUpdatedAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    const metaInfo =
      daysSinceUpdate !== null && daysSinceUpdate > 0
        ? `\n\n---\n_Last conversation: ${daysSinceUpdate} day${daysSinceUpdate > 1 ? "s" : ""} ago. Total sessions: ${context.totalConversations || 1}_`
        : "";

    return sections.join("\n\n") + metaInfo;
  } catch (error) {
    console.error("[ConversationSummary] Error loading context:", error);
    return buildFirstConversationContext();
  }
}

/**
 * Context for first-time conversations
 */
function buildFirstConversationContext(): string {
  return `## Session Context
This is a new student or first conversation. No previous context is available.

Focus on:
- Learning about the student's background and goals
- Understanding their current stage in the college journey
- Building rapport and trust
- Identifying immediate needs and priorities`;
}

/**
 * Build advisor preferences section
 */
function buildAdvisorPreferencesSection(
  preferences: string | null,
  accountabilityLevel: string
): string | null {
  const parts: string[] = [];

  // Map accountability level to coaching style
  const accountabilityStyles: Record<string, string> = {
    light: "Light accountability - give gentle suggestions without pushing too hard",
    moderate: "Moderate accountability - balanced encouragement with clear expectations",
    high: "High accountability - proactive follow-ups and direct challenge when needed",
  };

  if (accountabilityLevel && accountabilityLevel !== "moderate") {
    parts.push(
      `Coaching style: ${accountabilityStyles[accountabilityLevel] || accountabilityStyles.moderate}`
    );
  }

  if (preferences) {
    parts.push(preferences);
  }

  if (parts.length === 0) return null;

  return `## Advisor Preferences\n${parts.join("\n")}`;
}

/**
 * Summarizes a completed session and stores it.
 * NOTE: This is now handled by lib/conversations/summarize.ts
 * Keeping this for backwards compatibility.
 */
export async function summarizeAndStoreSession(
  profileId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  // Delegate to the new summarization system
  console.log(
    `[ConversationSummary] summarizeAndStoreSession called - use triggerConversationSummary instead`
  );
}
