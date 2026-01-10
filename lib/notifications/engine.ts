/**
 * Notification Engine
 *
 * LLM-based engine that decides what notifications to send and crafts messages.
 * Uses Kimi K2 via Groq for cost-effective, high-quality decisions.
 */

import { generateText } from "ai";
import { models } from "@/lib/ai/providers";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { NotificationEmail } from "@/lib/email/templates";
import {
  buildNotificationInput,
  getActiveStudentsForNotifications,
} from "./context";
import { OUTPUT_FORMAT_INSTRUCTIONS } from "./prompts";
import type {
  NotificationDecision,
  NotificationEngineInput,
  NotificationEngineResult,
  BatchNotificationResult,
} from "./types";

// Use Kimi K2 for notification decisions (Sonnet-quality at Haiku cost)
const NOTIFICATION_MODEL = models.groq.kimiK2;

// =============================================================================
// MAIN ENGINE
// =============================================================================

/**
 * Process a single recipient and decide whether to send a notification.
 */
export async function processRecipient(
  userId: string
): Promise<NotificationEngineResult | null> {
  const startTime = Date.now();

  try {
    // Build the input context
    const input = await buildNotificationInput(userId);
    if (!input) {
      console.log(`[Notifications] No valid input for user ${userId}, skipping`);
      return null;
    }

    // Call the LLM
    const decision = await makeNotificationDecision(input);

    const result: NotificationEngineResult = {
      recipientId: userId,
      decision,
      processingTimeMs: Date.now() - startTime,
    };

    // If we should send, save and deliver the notification
    if (decision.shouldSend && decision.notificationType !== "none") {
      await saveAndDeliverNotification(userId, input, decision);
    } else {
      // Log that we decided not to send
      console.log(
        `[Notifications] Skipping ${userId}: ${decision.reasoning.slice(0, 100)}`
      );
    }

    return result;
  } catch (error) {
    console.error(`[Notifications] Error processing ${userId}:`, error);
    return {
      recipientId: userId,
      decision: {
        shouldSend: false,
        reasoning: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        notificationType: "none",
        urgency: "low",
        channels: "email",
        messages: {
          mobile: "",
          email: { subject: "", body: "" },
        },
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Run the daily notification batch for all active students.
 */
export async function runDailyNotificationBatch(): Promise<BatchNotificationResult> {
  const startTime = Date.now();
  console.log("[Notifications] Starting daily batch run...");

  const results: NotificationEngineResult[] = [];
  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;

  try {
    // Get all active students
    const userIds = await getActiveStudentsForNotifications();
    console.log(`[Notifications] Processing ${userIds.length} students`);

    // Process each student sequentially (to avoid rate limits)
    // Could be parallelized with batching if needed
    for (const userId of userIds) {
      const result = await processRecipient(userId);

      if (result) {
        results.push(result);

        if (result.decision.shouldSend) {
          sentCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }

      // Small delay to avoid hammering the API
      await sleep(100);
    }

    console.log(
      `[Notifications] Batch complete: ${sentCount} sent, ${skippedCount} skipped, ${failedCount} failed`
    );

    return {
      processedCount: userIds.length,
      sentCount,
      skippedCount,
      failedCount,
      results,
      totalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    console.error("[Notifications] Batch run failed:", error);
    return {
      processedCount: 0,
      sentCount,
      skippedCount,
      failedCount: failedCount + 1,
      results,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// LLM DECISION MAKING
// =============================================================================

async function makeNotificationDecision(
  input: NotificationEngineInput
): Promise<NotificationDecision> {
  // Build the prompt
  const prompt = buildLLMPrompt(input);

  try {
    const result = await generateText({
      model: NOTIFICATION_MODEL,
      system: input.systemInstructions,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent decisions
      maxTokens: 800,
    });

    // Parse the JSON response
    const decision = parseDecisionResponse(result.text);
    return decision;
  } catch (error) {
    console.error("[Notifications] LLM call failed:", error);

    // Return a safe default
    return {
      shouldSend: false,
      reasoning: "LLM call failed, skipping to be safe",
      notificationType: "none",
      urgency: "low",
      channels: "email",
      messages: {
        mobile: "",
        email: { subject: "", body: "" },
      },
    };
  }
}

function buildLLMPrompt(input: NotificationEngineInput): string {
  const { recipient, currentDate, dayOfWeek, timeOfYear, recentNotifications } =
    input;

  const ctx = recipient.studentContext;

  // Build deadline summary
  let deadlineSummary = "No upcoming deadlines.";
  if (ctx) {
    const allDeadlines = [
      ...ctx.urgentDeadlines,
      ...ctx.soonDeadlines,
      ...ctx.upcomingDeadlines,
    ];
    if (allDeadlines.length > 0) {
      deadlineSummary = allDeadlines
        .slice(0, 5)
        .map(
          (d) =>
            `- ${d.label}: ${d.daysUntil} days (${d.priority})`
        )
        .join("\n");
    }
  }

  // Build goals summary
  let goalsSummary = "No active goals.";
  if (ctx && ctx.activeGoals.length > 0) {
    goalsSummary = ctx.activeGoals
      .slice(0, 5)
      .map((g) => `- ${g.title} (${g.progress}% complete)`)
      .join("\n");
  }

  // Build recent notifications summary
  let recentNotifSummary = "No recent notifications sent.";
  if (recentNotifications.length > 0) {
    recentNotifSummary = recentNotifications
      .map(
        (n) =>
          `- ${n.type} on ${n.sentAt.split("T")[0]}: "${n.emailSubject || n.mobileMessage}"`
      )
      .join("\n");
  }

  // Build achievements summary
  let achievementsSummary = "No recent achievements.";
  if (ctx && ctx.recentAchievements.length > 0) {
    achievementsSummary = ctx.recentAchievements.join(", ");
  }

  return `## Current Context
Date: ${currentDate} (${dayOfWeek})
Time of Year: ${timeOfYear}

## Recipient
Name: ${recipient.name}
Type: ${recipient.type}
Grade: ${ctx?.grade || "Unknown"}

## Their Preferences
${recipient.preferences || "No specific preferences set."}

## Upcoming Deadlines
${deadlineSummary}

## Active Goals
${goalsSummary}

## Engagement
- Days since last login: ${ctx?.daysInactive ?? "Unknown"}
- Last advisor chat: ${ctx?.lastAdvisorChatAt?.split("T")[0] || "Never"}
- Overdue tasks: ${ctx?.overdueTaskCount ?? 0}
- Tasks completed this week: ${ctx?.recentlyCompletedCount ?? 0}

## Recent Achievements
${achievementsSummary}

## School List
${ctx?.applicationProgress || "No schools on list"}

## Recent Notifications Sent
${recentNotifSummary}

## Your Task
Based on all this context, decide whether to send a notification today and what it should say.

${OUTPUT_FORMAT_INSTRUCTIONS}`;
}

function parseDecisionResponse(text: string): NotificationDecision {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (typeof parsed.shouldSend !== "boolean") {
      throw new Error("Missing shouldSend field");
    }

    return {
      shouldSend: parsed.shouldSend,
      reasoning: parsed.reasoning || "No reasoning provided",
      notificationType: parsed.notificationType || "none",
      urgency: parsed.urgency || "low",
      channels: parsed.channels || "email",
      messages: {
        mobile: parsed.messages?.mobile || "",
        email: {
          subject: parsed.messages?.email?.subject || "",
          body: parsed.messages?.email?.body || "",
        },
      },
      relatedGoalId: parsed.relatedGoalId,
      relatedTaskId: parsed.relatedTaskId,
      relatedSchoolId: parsed.relatedSchoolId,
    };
  } catch (error) {
    console.error("[Notifications] Failed to parse LLM response:", text, error);

    return {
      shouldSend: false,
      reasoning: "Failed to parse LLM response",
      notificationType: "none",
      urgency: "low",
      channels: "email",
      messages: {
        mobile: "",
        email: { subject: "", body: "" },
      },
    };
  }
}

// =============================================================================
// NOTIFICATION DELIVERY
// =============================================================================

async function saveAndDeliverNotification(
  userId: string,
  input: NotificationEngineInput,
  decision: NotificationDecision
): Promise<void> {
  const { recipient } = input;

  // Save notification to database
  const notification = await prisma.notification.create({
    data: {
      userId,
      recipientType: recipient.type,
      type: decision.notificationType,
      channel: decision.channels,
      mobileMessage: decision.messages.mobile || null,
      emailSubject: decision.messages.email.subject || null,
      emailBody: decision.messages.email.body || null,
      reasoning: decision.reasoning,
      contextSnapshot: input as object,
      status: "pending",
      relatedGoalId: decision.relatedGoalId,
      relatedTaskId: decision.relatedTaskId,
      relatedSchoolId: decision.relatedSchoolId,
    },
  });

  // Deliver email if channel includes email
  if (decision.channels === "email" || decision.channels === "both") {
    try {
      await sendEmail({
        to: recipient.email,
        subject: decision.messages.email.subject,
        react: NotificationEmail({
          recipientName: recipient.name,
          subject: decision.messages.email.subject,
          body: decision.messages.email.body,
          notificationType: decision.notificationType,
        }),
        text: decision.messages.email.body,
      });

      // Update status to sent
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "sent",
          sentAt: new Date(),
        },
      });

      console.log(
        `[Notifications] Sent ${decision.notificationType} email to ${recipient.email}`
      );
    } catch (error) {
      console.error(
        `[Notifications] Failed to send email to ${recipient.email}:`,
        error
      );

      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "failed",
          failureReason:
            error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  }

  // TODO: Deliver mobile push notification if channel includes mobile
  if (decision.channels === "mobile" || decision.channels === "both") {
    // Mobile push notifications will be implemented later
    // For now, just log that we would have sent one
    console.log(
      `[Notifications] Would send mobile push to ${recipient.name}: ${decision.messages.mobile}`
    );
  }
}

// =============================================================================
// UTILITIES
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// EXPORTS FOR TESTING
// =============================================================================

export { makeNotificationDecision, buildLLMPrompt, parseDecisionResponse };
