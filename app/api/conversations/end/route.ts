import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import { endConversation } from "@/lib/conversations";
import { triggerConversationSummary } from "@/lib/conversations/summarize";

/**
 * POST /api/conversations/end
 * Called when user leaves the advisor page.
 * Marks conversation as ended and triggers background summarization.
 *
 * This endpoint is designed to be called via navigator.sendBeacon()
 * for reliable delivery even when the tab is closing.
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId required" },
        { status: 400 }
      );
    }

    // Mark conversation as ended
    await endConversation(conversationId);

    // Trigger background summarization
    triggerConversationSummary(conversationId, profileId);

    console.log(`[Conversations] Ended conversation ${conversationId}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Conversations] Error ending conversation:", error);
    return NextResponse.json(
      { error: "Failed to end conversation" },
      { status: 500 }
    );
  }
}
