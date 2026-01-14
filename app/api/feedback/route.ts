/**
 * Feedback API Endpoint
 *
 * POST /api/feedback
 * Accepts user feedback, processes with AI for spam detection and categorization,
 * stores in database, and sends email notification to admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { prisma } from "@/lib/db";
import { getCurrentProfileId, getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email/resend";
import { FeedbackEmail } from "@/lib/email/templates";
import { modelFor } from "@/lib/ai/providers";

// Admin email for notifications
const ADMIN_EMAIL = "abhishek.gutgutia@gmail.com";

interface FeedbackRequest {
  content: string;
  pageUrl?: string;
  posthogSessionId?: string;
  userAgent?: string;
}

interface AIAnalysis {
  isSpam: boolean;
  category: "bug" | "feature" | "ux" | "content" | "praise" | "general";
  summary: string;
}

/**
 * Analyze feedback using AI to detect spam and categorize
 */
async function analyzeFeedback(content: string): Promise<AIAnalysis> {
  const defaultResult: AIAnalysis = {
    isSpam: false,
    category: "general",
    summary: content.slice(0, 200),
  };

  try {
    const { text } = await generateText({
      model: modelFor.fast, // Claude Haiku - fast and cheap
      maxOutputTokens: 500,
      system: `You are analyzing user feedback for a college admissions prep application called Sesame3.
Your job is to:
1. Detect if the feedback is spam (gibberish, test messages, promotional content, off-topic)
2. Categorize legitimate feedback
3. Create a brief summary for the admin

Categories:
- bug: Technical issues, errors, things not working as expected
- feature: Feature requests, suggestions for new functionality
- ux: User experience issues, confusing interfaces, workflow problems
- content: Issues with content accuracy, missing information
- praise: Positive feedback, compliments, appreciation
- general: Everything else

Respond with JSON only, no other text:
{
  "isSpam": boolean,
  "category": "bug" | "feature" | "ux" | "content" | "praise" | "general",
  "summary": "Brief summary of the feedback in 1-2 sentences that captures the key issue/request"
}`,
      prompt: `Analyze this user feedback:\n\n"${content}"`,
    });

    // Parse the JSON response
    const cleaned = text.trim().replace(/```json\n?|\n?```/g, "");
    const analysis = JSON.parse(cleaned) as AIAnalysis;

    // Validate the response
    if (typeof analysis.isSpam !== "boolean") {
      analysis.isSpam = false;
    }
    if (!["bug", "feature", "ux", "content", "praise", "general"].includes(analysis.category)) {
      analysis.category = "general";
    }
    if (!analysis.summary || typeof analysis.summary !== "string") {
      analysis.summary = content.slice(0, 200);
    }

    return analysis;
  } catch (error) {
    console.error("[Feedback] AI analysis failed:", error);
    return defaultResult;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as FeedbackRequest;
    const { content, pageUrl, posthogSessionId, userAgent } = body;

    // Validate content
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Feedback content is required" },
        { status: 400 }
      );
    }

    // Limit content length (prevent abuse)
    if (content.length > 10000) {
      return NextResponse.json(
        { error: "Feedback is too long (max 10,000 characters)" },
        { status: 400 }
      );
    }

    // Get user info (optional - feedback can be from logged-in or potentially anonymous users)
    const [user, profileId] = await Promise.all([
      getCurrentUser(),
      getCurrentProfileId(),
    ]);

    // Analyze feedback with AI
    const analysis = await analyzeFeedback(content.trim());

    // Store feedback in database
    const feedback = await prisma.feedback.create({
      data: {
        studentProfileId: profileId,
        content: content.trim(),
        isSpam: analysis.isSpam,
        category: analysis.category,
        processedSummary: analysis.summary,
        pageUrl,
        posthogSessionId,
        userAgent,
      },
    });

    // Only send email notification if NOT spam
    if (!analysis.isSpam) {
      // Get user details for email
      let userName: string | undefined;
      let userEmail: string | undefined;

      if (user) {
        userEmail = user.email;
        userName = user.name;

        // If no name on user, try to get from profile
        if (!userName && profileId) {
          const profile = await prisma.studentProfile.findUnique({
            where: { id: profileId },
            select: { firstName: true, lastName: true },
          });
          if (profile) {
            userName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
          }
        }
      }

      // Send email notification
      const emailResult = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `[${analysis.category.toUpperCase()}] New feedback from ${userName || "a user"}`,
        react: FeedbackEmail({
          feedbackId: feedback.id,
          userName,
          userEmail,
          originalContent: content.trim(),
          category: analysis.category,
          processedSummary: analysis.summary,
          pageUrl,
          posthogSessionId,
          userAgent,
          submittedAt: new Date().toLocaleString("en-US", {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          }),
        }),
        text: `New feedback received:\n\nCategory: ${analysis.category}\nFrom: ${userName || "Anonymous"} ${userEmail ? `(${userEmail})` : ""}\n\nSummary:\n${analysis.summary}\n\nOriginal:\n${content.trim()}\n\nPage: ${pageUrl || "Unknown"}\nSession: ${posthogSessionId ? `https://us.posthog.com/replay/${posthogSessionId}` : "N/A"}`,
      });

      // Update notification status
      if (emailResult.success) {
        await prisma.feedback.update({
          where: { id: feedback.id },
          data: { notificationSent: true },
        });
      }
    }

    return NextResponse.json({
      success: true,
      feedbackId: feedback.id,
      isSpam: analysis.isSpam,
    });
  } catch (error) {
    console.error("[Feedback] Error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
