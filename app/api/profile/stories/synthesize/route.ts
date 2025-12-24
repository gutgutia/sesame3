import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { models } from "@/lib/ai/providers";
import { requireProfile } from "@/lib/auth";
import { synthesizeStoryPrompt, STORY_THEMES } from "@/lib/prompts";

// Schema for synthesized story
const SynthesizedStorySchema = z.object({
  title: z.string().describe("A compelling 5-8 word title"),
  summary: z.string().describe("2-3 sentence third-person summary"),
  themes: z.array(z.enum(STORY_THEMES)).describe("2-4 relevant themes"),
});

// POST /api/profile/stories/synthesize - Synthesize a story from raw content
export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = await request.json();

    const { rawContent, contentType } = body;

    if (!rawContent || !contentType) {
      return NextResponse.json(
        { error: "Missing rawContent or contentType" },
        { status: 400 }
      );
    }

    if (contentType !== "conversation" && contentType !== "note") {
      return NextResponse.json(
        { error: "contentType must be 'conversation' or 'note'" },
        { status: 400 }
      );
    }

    // Use Gemini to synthesize the story
    const { object: synthesized } = await generateObject({
      model: models.google.gemini3Flash,
      schema: SynthesizedStorySchema,
      prompt: synthesizeStoryPrompt(rawContent, contentType),
    });

    return NextResponse.json(synthesized);
  } catch (error) {
    console.error("Error synthesizing story:", error);
    return NextResponse.json(
      { error: "Failed to synthesize story" },
      { status: 500 }
    );
  }
}

