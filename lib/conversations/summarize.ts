/**
 * Conversation Summarization
 *
 * Handles generating summaries for conversations and updating
 * the master summary in StudentContext.
 */

import { prisma } from "@/lib/db";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const anthropic = createAnthropic();

// Use Haiku for fast, cost-effective summarization
const SUMMARIZATION_MODEL = anthropic("claude-3-5-haiku-latest");

/**
 * Trigger conversation summarization in the background.
 * Fire-and-forget - doesn't block the caller.
 *
 * Later: Replace with Trigger.dev for production reliability.
 */
export function triggerConversationSummary(
  conversationId: string,
  profileId: string
): void {
  // Fire and forget - run in background
  summarizeConversationInBackground(conversationId, profileId).catch((err) => {
    console.error(
      `[Summarize] Background summarization failed for ${conversationId}:`,
      err
    );
    // Will be caught by catch-up mechanism on next visit
  });
}

/**
 * Summarize a conversation and update the master summary.
 */
async function summarizeConversationInBackground(
  conversationId: string,
  profileId: string
): Promise<void> {
  const startTime = Date.now();
  console.log(`[Summarize] Starting summarization for conversation ${conversationId}`);

  // 1. Load conversation with messages
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          role: true,
          content: true,
        },
      },
    },
  });

  if (!conversation || conversation.messages.length === 0) {
    console.log(`[Summarize] No messages to summarize for ${conversationId}`);
    return;
  }

  // Skip if already summarized
  if (conversation.summary) {
    console.log(`[Summarize] Conversation ${conversationId} already summarized`);
    return;
  }

  // 2. Format messages for the prompt
  const formattedMessages = conversation.messages
    .map((m) => `${m.role === "user" ? "Student" : "Advisor"}: ${m.content}`)
    .join("\n\n");

  // 3. Generate conversation summary
  const { summary, summaryForUser } = await generateConversationSummary(
    formattedMessages
  );

  // 4. Save conversation summary
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      summary,
      summaryForUser,
      summaryUpdatedAt: new Date(),
    },
  });

  console.log(
    `[Summarize] Conversation summary saved in ${Date.now() - startTime}ms`
  );

  // 5. Update master summary
  await updateMasterSummary(profileId, summary, conversation.startedAt);

  // 6. Regenerate objectives for next session (background)
  const { triggerObjectiveGeneration } = await import("@/lib/objectives/generate");
  triggerObjectiveGeneration(profileId);

  console.log(
    `[Summarize] Full summarization complete in ${Date.now() - startTime}ms`
  );
}

/**
 * Generate a summary for a single conversation.
 */
async function generateConversationSummary(
  messages: string
): Promise<{ summary: string; summaryForUser: object }> {
  const prompt = `You are summarizing a conversation between a college admissions advisor and a high school student.

CONVERSATION:
${messages}

Generate two summaries:

1. ADVISOR SUMMARY (for AI context, ~150-200 words):
Write a prose summary that captures:
- Key topics discussed
- Any decisions the student made or commitments they gave
- Emotional state observed (stressed, confident, uncertain, etc.)
- Any data the student shared (test scores, activities, etc.)
- Unresolved questions or next steps
This will be used to give the advisor context in future conversations.

2. STUDENT SUMMARY (structured, for display):
Create a structured summary with:
- headline: A short title (e.g., "Planned Stanford essay timeline")
- topicsDiscussed: Array of 2-4 main topics
- decisionsReached: Array of any decisions made (or empty if none)
- actionItems: Array of next steps or commitments (or empty if none)

Respond in JSON format:
{
  "advisorSummary": "prose summary here...",
  "studentSummary": {
    "headline": "...",
    "topicsDiscussed": ["...", "..."],
    "decisionsReached": ["...", "..."],
    "actionItems": ["...", "..."]
  }
}`;

  try {
    const result = await generateText({
      model: SUMMARIZATION_MODEL,
      prompt,
      temperature: 0.3,
      maxOutputTokens: 800,
    });

    const parsed = JSON.parse(result.text);

    return {
      summary: parsed.advisorSummary,
      summaryForUser: parsed.studentSummary,
    };
  } catch (error) {
    console.error("[Summarize] Error generating conversation summary:", error);

    // Fallback summary
    return {
      summary: "Conversation summary generation failed. Review messages for context.",
      summaryForUser: {
        headline: "Conversation with advisor",
        topicsDiscussed: [],
        decisionsReached: [],
        actionItems: [],
      },
    };
  }
}

/**
 * Update the master summary with the latest conversation.
 */
async function updateMasterSummary(
  profileId: string,
  newConversationSummary: string,
  conversationDate: Date
): Promise<void> {
  // Load current StudentContext
  const context = await prisma.studentContext.findUnique({
    where: { studentProfileId: profileId },
  });

  // Load student profile for quick context
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: {
      firstName: true,
      lastName: true,
      grade: true,
      highSchoolName: true,
      testing: {
        select: {
          satScores: { take: 1, orderBy: { total: "desc" }, select: { total: true } },
          actScores: { take: 1, orderBy: { composite: "desc" }, select: { composite: true } },
        },
      },
      academics: {
        select: {
          schoolReportedGpaUnweighted: true,
        },
      },
      schoolList: {
        take: 3,
        orderBy: { displayOrder: "asc" },
        select: { school: { select: { name: true } } },
      },
    },
  });

  // Load recent conversation summaries (last 3)
  const recentConversations = await prisma.conversation.findMany({
    where: {
      studentProfileId: profileId,
      summary: { not: null },
    },
    orderBy: { startedAt: "desc" },
    take: 3,
    select: {
      summary: true,
      startedAt: true,
    },
  });

  // Generate updated master summary
  const updatedSummary = await generateMasterSummary(
    profile,
    context,
    newConversationSummary,
    conversationDate,
    recentConversations
  );

  // Save updated master summary
  await prisma.studentContext.upsert({
    where: { studentProfileId: profileId },
    update: {
      quickContext: updatedSummary.quickContext,
      recentSessions: updatedSummary.recentSessions,
      studentUnderstanding: updatedSummary.studentUnderstanding,
      openCommitments: updatedSummary.openCommitments,
      masterSummaryUpdatedAt: new Date(),
      totalMessages: { increment: 1 },
    },
    create: {
      studentProfileId: profileId,
      quickContext: updatedSummary.quickContext,
      recentSessions: updatedSummary.recentSessions,
      studentUnderstanding: updatedSummary.studentUnderstanding,
      openCommitments: updatedSummary.openCommitments,
      masterSummaryUpdatedAt: new Date(),
      totalConversations: 1,
      totalMessages: 1,
    },
  });
}

/**
 * Generate the master summary components.
 */
async function generateMasterSummary(
  profile: any,
  existingContext: any,
  newConversationSummary: string,
  conversationDate: Date,
  recentConversations: Array<{ summary: string | null; startedAt: Date }>
): Promise<{
  quickContext: string;
  recentSessions: string;
  studentUnderstanding: string;
  openCommitments: string;
}> {
  // Build profile info for quick context
  const name = profile?.firstName || "Student";
  const grade = profile?.grade || "unknown grade";
  const school = profile?.highSchoolName || "their high school";
  const gpa = profile?.academics?.schoolReportedGpaUnweighted;
  const sat = profile?.testing?.satScores?.[0]?.total;
  const act = profile?.testing?.actScores?.[0]?.composite;
  const topSchools = profile?.schoolList
    ?.map((s: any) => s.school?.name)
    .filter(Boolean)
    .slice(0, 3);

  // Format stats
  const stats = [
    gpa ? `${gpa} GPA` : null,
    sat ? `${sat} SAT` : null,
    act ? `${act} ACT` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const schoolsList =
    topSchools?.length > 0 ? `Targeting: ${topSchools.join(", ")}` : "";

  // Quick context (simple, no LLM needed)
  const quickContext = `${name}, ${grade} at ${school}. ${stats ? stats + "." : ""} ${schoolsList}`.trim();

  // Format recent sessions for context
  const recentSessionsFormatted = recentConversations
    .map((c) => {
      const date = c.startedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return `${date}: ${c.summary}`;
    })
    .join("\n\n");

  // For the complex parts, use LLM
  const prompt = `You are updating a college counselor's notes about a student after a conversation.

STUDENT QUICK CONTEXT:
${quickContext}

CURRENT UNDERSTANDING OF STUDENT:
${existingContext?.studentUnderstanding || "No prior understanding yet."}

CURRENT OPEN COMMITMENTS:
${existingContext?.openCommitments || "No known commitments."}

NEW CONVERSATION (${conversationDate.toLocaleDateString()}):
${newConversationSummary}

PREVIOUS RECENT SESSIONS:
${recentSessionsFormatted || "None yet."}

Generate updated notes:

1. RECENT SESSIONS (~200 words max):
Summarize the last 2-3 conversations, most recent first. Include dates.
Format: "Dec 26: [summary]. Dec 24: [summary]."

2. STUDENT UNDERSTANDING (~150 words max):
Update your understanding of this student:
- Their strengths and unique qualities
- Their concerns or challenges
- Their communication preferences (if evident)
Keep stable facts, update anything that's changed.

3. OPEN COMMITMENTS (~100 words max):
List any active commitments or action items:
- Things they said they'd do
- Deadlines they mentioned
- Follow-ups needed
Remove completed items, add new ones.

Respond in JSON:
{
  "recentSessions": "...",
  "studentUnderstanding": "...",
  "openCommitments": "..."
}`;

  try {
    const result = await generateText({
      model: SUMMARIZATION_MODEL,
      prompt,
      temperature: 0.3,
      maxOutputTokens: 600,
    });

    const parsed = JSON.parse(result.text);

    return {
      quickContext,
      recentSessions: parsed.recentSessions,
      studentUnderstanding: parsed.studentUnderstanding,
      openCommitments: parsed.openCommitments,
    };
  } catch (error) {
    console.error("[Summarize] Error generating master summary:", error);

    // Fallback - preserve existing or use minimal
    return {
      quickContext,
      recentSessions:
        existingContext?.recentSessions ||
        `${conversationDate.toLocaleDateString()}: ${newConversationSummary.slice(0, 200)}`,
      studentUnderstanding:
        existingContext?.studentUnderstanding || "Understanding being developed.",
      openCommitments: existingContext?.openCommitments || "No known commitments.",
    };
  }
}

/**
 * Process any pending summarizations (catch-up mechanism).
 * Called on server start or periodically.
 */
export async function processPendingSummarizations(limit: number = 5): Promise<number> {
  const { getConversationsNeedingSummary } = await import("@/lib/conversations");

  const pending = await getConversationsNeedingSummary(limit);

  console.log(`[Summarize] Found ${pending.length} conversations needing summarization`);

  for (const conv of pending) {
    try {
      await summarizeConversationInBackground(conv.id, conv.studentProfileId);
    } catch (error) {
      console.error(`[Summarize] Failed to summarize ${conv.id}:`, error);
    }
  }

  return pending.length;
}
