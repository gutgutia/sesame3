/**
 * Welcome Message API
 * Generates an AI-powered initial greeting based on user context
 *
 * Optimized for speed:
 * - Uses in-memory cache for profile data (~1ms vs ~1000ms)
 * - Uses Kimi K2 via Groq for fast generation (~300ms)
 *
 * Also saves the welcome message to the database so it appears when resuming
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { modelFor } from "@/lib/ai";
import { getCurrentProfileId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCachedProfile, setCachedProfile } from "@/lib/cache/profile-cache";

// Mode descriptions for the AI
const MODE_CONTEXT: Record<string, string> = {
  onboarding: "The student just signed up. This is their FIRST interaction. Warmly welcome them and ask for their name.",
  chances: "The student wants to check their admission chances.",
  schools: "The student wants to build their college list.",
  planning: "The student wants to set goals and plan ahead.",
  profile: "The student wants to update their profile.",
  story: "The student wants to share their personal story.",
  general: "General conversation.",
};

// Fallback messages by mode (when we can't generate personalized ones)
const FALLBACK_MESSAGES: Record<string, string> = {
  onboarding: "Hi! I'm Sesame, your college prep guide. I'm here to help you navigate the college journey calmly — one step at a time. First things first: what should I call you?",
  chances: "Hi! I'm Sesame, your college prep advisor. Ready to explore your chances at some schools?",
  schools: "Hi! I'm Sesame, your college prep advisor. Let's work on your school list!",
  planning: "Hi! I'm Sesame, your college prep advisor. What goals are you working toward?",
  profile: "Hi! I'm Sesame, your college prep advisor. Let's update your profile!",
  story: "Hi! I'm Sesame, your college prep advisor. I'd love to hear your story.",
  general: "Hi! I'm Sesame, your college prep advisor. What's on your mind today?",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { mode = "general", conversationId, saveOnly, message: providedMessage } = await request.json();

    // If saveOnly mode, just save the provided message to DB
    if (saveOnly && conversationId && providedMessage) {
      try {
        await prisma.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: providedMessage,
            model: "kimi-k2",
            provider: "groq",
          },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 1 },
          },
        });
        console.log(`[Welcome] Saved pre-loaded welcome message to conversation ${conversationId}`);
        return NextResponse.json({ saved: true });
      } catch (err) {
        console.error("[Welcome] Failed to save welcome message:", err);
        return NextResponse.json({ saved: false, error: "Failed to save" }, { status: 500 });
      }
    }
    
    // Get current user's profile ID
    const profileId = await getCurrentProfileId();
    if (!profileId) {
      // Use mode-specific fallback
      return NextResponse.json({
        message: FALLBACK_MESSAGES[mode] || FALLBACK_MESSAGES.general,
      });
    }
    
    // Check cache first
    const cachedProfile = getCachedProfile(profileId);
    let dbTime = 0;
    let cacheHit = false;

    // Profile data (without cachedAt metadata)
    let profileData: {
      firstName: string | null;
      preferredName: string | null;
      grade: string | null;
      activities: Array<{ title: string; isLeadership: boolean }>;
    } | null = null;

    if (cachedProfile) {
      cacheHit = true;
      profileData = cachedProfile;
    } else {
      // Lightweight profile fetch - only what we need for welcome
      const dbStart = Date.now();
      const dbProfile = await prisma.studentProfile.findUnique({
        where: { id: profileId },
        select: {
          firstName: true,
          preferredName: true,
          grade: true,
          activities: {
            select: { title: true, isLeadership: true },
            take: 2,
            orderBy: { displayOrder: "asc" },
          },
        },
      });
      dbTime = Date.now() - dbStart;

      if (dbProfile) {
        profileData = {
          firstName: dbProfile.firstName,
          preferredName: dbProfile.preferredName,
          grade: dbProfile.grade,
          activities: dbProfile.activities,
        };
        // Cache for next time
        setCachedProfile(profileId, profileData);
      }
    }
    
    // Build minimal context
    const name = profileData?.preferredName || profileData?.firstName || null;
    const grade = profileData?.grade || null;
    const activities = profileData?.activities || [];
    
    let profileSummary = "";
    if (name) {
      profileSummary = `Student: ${name}`;
      if (grade) profileSummary += `, ${grade}`;
      if (activities.length > 0) {
        const activityNames = activities.map(a => 
          a.isLeadership ? `${a.title} (leadership)` : a.title
        ).join(", ");
        profileSummary += `. Activities: ${activityNames}`;
      }
    }
    
    // For onboarding, use a specific approach
    const isOnboarding = mode === "onboarding";

    // Generate personalized welcome
    const systemPrompt = isOnboarding
      ? `You are Sesame, a warm college prep guide.
Generate a brief opening message for a BRAND NEW student (2-3 sentences max).

This is their FIRST time using the app. You don't know anything about them yet.

Rules:
- Welcome them warmly
- Briefly introduce yourself and your purpose (helping with college prep, keeping things calm)
- End by asking for their name
- Keep it SHORT and friendly
- Do NOT assume you know their name or grade`
      : `You are Sesame, a warm college admissions advisor.
Generate a brief opening message (2-3 sentences max).

Mode: ${MODE_CONTEXT[mode] || MODE_CONTEXT.general}
${profileSummary ? `\nStudent: ${profileSummary}` : "\nNew student - no profile yet."}

Rules:
- Be warm and casual
- Use their name if known
- Reference an activity if available
- End with a question
- Keep it SHORT`;

    const genStart = Date.now();
    
    const { text } = await generateText({
      model: modelFor.fastParsing,
      system: systemPrompt,
      prompt: "Generate the opening message.",
      temperature: 0.7,
      maxOutputTokens: 150,
    });
    
    const genTime = Date.now() - genStart;
    const welcomeMessage = text.trim();
    console.log(`[Welcome] ${cacheHit ? "CACHE HIT" : `DB: ${dbTime}ms`}, Gen: ${genTime}ms, Total: ${Date.now() - startTime}ms`);

    // Save welcome message to database if conversationId is provided
    if (conversationId) {
      try {
        await prisma.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: welcomeMessage,
            model: "kimi-k2",
            provider: "groq",
          },
        });
        // Update conversation lastMessageAt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: new Date(),
            messageCount: { increment: 1 },
          },
        });
        console.log(`[Welcome] Saved welcome message to conversation ${conversationId}`);
      } catch (err) {
        console.error("[Welcome] Failed to save welcome message:", err);
      }
    }

    return NextResponse.json({ message: welcomeMessage });
    
  } catch (error) {
    console.error("Welcome message error:", error);
    // Try to get mode from request for fallback, default to general
    let fallbackMode = "general";
    try {
      const body = await request.clone().json();
      fallbackMode = body.mode || "general";
    } catch {
      // Ignore parse errors, use general
    }
    return NextResponse.json({
      message: FALLBACK_MESSAGES[fallbackMode] || FALLBACK_MESSAGES.general,
    });
  }
}
