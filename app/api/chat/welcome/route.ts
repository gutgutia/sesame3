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

// Mode-specific context and opening prompts for the AI
const MODE_CONTEXT: Record<string, string> = {
  onboarding: "The student just signed up. This is their FIRST interaction. Warmly welcome them and ask for their name.",
  chances: "The student clicked 'Check Chances' - they want to understand their admission odds. Start by asking which schools they're curious about, or if they want a general assessment.",
  schools: "The student clicked 'Build School List' - they need help discovering and organizing colleges. Ask what they're looking for in a school (size, location, vibe) or if they have any schools in mind already.",
  planning: "The student clicked 'Need ideas?' from the planning page - they want help brainstorming goals. Ask what area they want to focus on: summer programs, competitions, projects, or something else.",
  profile: "The student wants to update their profile. Ask what they'd like to add - activities, awards, test scores, or something else.",
  story: "The student wants to share their personal story. Ask an open-ended question about what makes them unique or what they're passionate about.",
  general: "General conversation - ask what's on their mind.",
};

// Fallback messages by mode (when we can't generate personalized ones)
const FALLBACK_MESSAGES: Record<string, string> = {
  onboarding: "Hi! I'm Sesame, your college prep guide. I'm here to help you navigate the college journey calmly — one step at a time. First things first: what should I call you?",
  chances: "Hey! Ready to explore your admission chances? Which schools are you most curious about — or would you like me to give you a general sense of where you stand?",
  schools: "Let's build your college list! Are there any schools you're already interested in, or would you like me to suggest some based on what you're looking for?",
  planning: "Let's brainstorm some goals! What area are you thinking about — summer programs, competitions, passion projects, or something else?",
  profile: "Let's get your profile updated! What would you like to add — activities, awards, test scores, or something else?",
  story: "I'd love to hear more about you — beyond the grades and scores. What's something you're really passionate about, or what makes you unique?",
  general: "Hey! What's on your mind today?",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Parse request body ONCE and save mode for fallback
  // (can't re-read request body in catch block after it's consumed)
  let mode = "general";
  let conversationId: string | undefined;
  let saveOnly: boolean | undefined;
  let providedMessage: string | undefined;

  try {
    const body = await request.json();
    mode = body.mode || "general";
    conversationId = body.conversationId;
    saveOnly = body.saveOnly;
    providedMessage = body.message;

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
    
    // For onboarding, we don't need profile data - skip expensive getCurrentProfileId()
    const isOnboarding = mode === "onboarding";

    let profileSummary = "";
    let dbTime = 0;
    let cacheHit = false;

    // Only fetch profile for non-onboarding modes
    if (!isOnboarding) {
      const profileId = await getCurrentProfileId();
      if (!profileId) {
        return NextResponse.json({
          message: FALLBACK_MESSAGES[mode] || FALLBACK_MESSAGES.general,
        });
      }

      // Check cache first
      const cachedProfile = getCachedProfile(profileId);

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
          setCachedProfile(profileId, profileData);
        }
      }

      // Build minimal context
      const name = profileData?.preferredName || profileData?.firstName || null;
      const grade = profileData?.grade || null;
      const activities = profileData?.activities || [];

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
    }

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
Generate a brief, contextual opening message (2-3 sentences max).

${MODE_CONTEXT[mode] || MODE_CONTEXT.general}
${profileSummary ? `\nStudent info: ${profileSummary}` : ""}

Rules:
- Be warm and casual, not corporate
- Use their name naturally if known
- Get straight to why they're here - ask a relevant question
- Keep it SHORT - don't over-explain
- Sound like a helpful friend, not a chatbot`;

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
    // Use mode that was saved before any errors could occur
    console.log(`[Welcome] Error occurred, using ${mode} fallback`);
    return NextResponse.json({
      message: FALLBACK_MESSAGES[mode] || FALLBACK_MESSAGES.general,
    });
  }
}
