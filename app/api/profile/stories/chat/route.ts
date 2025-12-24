import { NextRequest } from "next/server";
import { streamText } from "ai";
import { models } from "@/lib/ai/providers";
import { requireProfile } from "@/lib/auth";
import { STORY_CAPTURE_SYSTEM, STORY_CONVERSATION_OPENER } from "@/lib/prompts";

// POST /api/profile/stories/chat - Stream story conversation
export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = await request.json();

    const { messages } = body;

    // If no messages yet, return the opener
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({
          role: "assistant",
          content: STORY_CONVERSATION_OPENER,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Stream the conversation
    const result = streamText({
      model: models.claude.sonnet,
      system: STORY_CAPTURE_SYSTEM,
      messages,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error in story chat:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process story chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

