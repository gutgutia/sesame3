import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import { getOrCreateConversation } from "@/lib/conversations";
import { triggerConversationSummary } from "@/lib/conversations/summarize";

/**
 * GET /api/conversations
 * Get or resume the current conversation.
 * Returns the active conversation (within time window) or creates a new one.
 */
export async function GET(request: NextRequest) {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const mode =
      request.nextUrl.searchParams.get("mode") || "general";

    const { conversation, isNew, pendingSummarization } =
      await getOrCreateConversation(profileId, mode);

    // Trigger background summarization for any old conversations
    if (pendingSummarization.length > 0) {
      console.log(
        `[Conversations] Triggering summarization for ${pendingSummarization.length} conversations`
      );
      for (const convId of pendingSummarization) {
        triggerConversationSummary(convId, profileId);
      }
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        mode: conversation.mode,
        isNew,
        messageCount: conversation.messageCount,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      },
    });
  } catch (error) {
    console.error("[Conversations] Error:", error);
    return NextResponse.json(
      { error: "Failed to get conversation" },
      { status: 500 }
    );
  }
}
