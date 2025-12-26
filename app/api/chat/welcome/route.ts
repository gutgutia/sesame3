/**
 * Welcome Message API
 * Generates an AI-powered initial greeting based on user context
 * 
 * Optimized for speed:
 * - Uses in-memory cache for profile data (~1ms vs ~1000ms)
 * - Uses Kimi K2 via Groq for fast generation (~300ms)
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { modelFor } from "@/lib/ai";
import { getCurrentProfileId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCachedProfile, setCachedProfile } from "@/lib/cache/profile-cache";

// Mode descriptions for the AI
const MODE_CONTEXT: Record<string, string> = {
  onboarding: "The student just signed up. Focus on warmly welcoming them and asking for their name.",
  chances: "The student wants to check their admission chances.",
  schools: "The student wants to build their college list.",
  planning: "The student wants to set goals and plan ahead.",
  profile: "The student wants to update their profile.",
  story: "The student wants to share their personal story.",
  general: "General conversation.",
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { mode = "general" } = await request.json();
    
    // Get current user's profile ID
    const profileId = await getCurrentProfileId();
    if (!profileId) {
      return NextResponse.json({
        message: "Hi! I'm Sesame, your college prep advisor. What's on your mind today?",
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
    
    // Generate personalized welcome
    const systemPrompt = `You are Sesame, a warm college admissions advisor.
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
    console.log(`[Welcome] ${cacheHit ? "CACHE HIT" : `DB: ${dbTime}ms`}, Gen: ${genTime}ms, Total: ${Date.now() - startTime}ms`);
    
    return NextResponse.json({ message: text.trim() });
    
  } catch (error) {
    console.error("Welcome message error:", error);
    return NextResponse.json({
      message: "Hi! I'm Sesame, your college prep advisor. What's on your mind today?",
    });
  }
}
