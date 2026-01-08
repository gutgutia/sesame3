/**
 * Save a message to a conversation
 * Used for persisting re-entry messages and other client-generated messages
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const profileId = await getCurrentProfileId();
    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { conversationId, role, content } = await request.json();

    if (!conversationId || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify the conversation belongs to this user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        studentProfileId: profileId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        model: "system", // Mark as system-generated (re-entry message)
        provider: "system",
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

    return NextResponse.json({ id: message.id });
  } catch (error) {
    console.error("[Message] Error saving message:", error);
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
