/**
 * Conversation Lifecycle Management
 *
 * Handles the lifecycle of advisor conversations:
 * - Finding active conversations (within time window)
 * - Creating new conversations
 * - Ending conversations and triggering summarization
 */

import { prisma } from "@/lib/db";

// Time window for considering a conversation "active" (4 hours)
const CONVERSATION_TIME_WINDOW_MS = 4 * 60 * 60 * 1000;

export interface ConversationWithMessages {
  id: string;
  mode: string | null;
  startedAt: Date;
  lastMessageAt: Date | null;
  messageCount: number;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

/**
 * Get or create a conversation for the current session.
 *
 * Logic:
 * - If there's a conversation with lastMessageAt within TIME_WINDOW, resume it
 * - Otherwise, create a new conversation
 * - Also checks for any old conversations that need summarizing
 */
export async function getOrCreateConversation(
  profileId: string,
  mode: string = "general"
): Promise<{
  conversation: ConversationWithMessages;
  isNew: boolean;
  pendingSummarization: string[]; // IDs of conversations that need summarizing
}> {
  const now = new Date();
  const timeWindowStart = new Date(now.getTime() - CONVERSATION_TIME_WINDOW_MS);

  // Find active conversation (within time window)
  const activeConversation = await prisma.conversation.findFirst({
    where: {
      studentProfileId: profileId,
      endedAt: null, // Not explicitly ended
      lastMessageAt: {
        gte: timeWindowStart,
      },
    },
    orderBy: {
      lastMessageAt: "desc",
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  // Find conversations that need summarizing (old, no summary, has messages)
  const conversationsNeedingSummary = await prisma.conversation.findMany({
    where: {
      studentProfileId: profileId,
      summary: null,
      messageCount: { gt: 0 },
      lastMessageAt: {
        lt: timeWindowStart, // Older than time window
      },
    },
    select: { id: true },
  });

  const pendingSummarization = conversationsNeedingSummary.map((c) => c.id);

  if (activeConversation) {
    return {
      conversation: {
        id: activeConversation.id,
        mode: activeConversation.mode,
        startedAt: activeConversation.startedAt,
        lastMessageAt: activeConversation.lastMessageAt,
        messageCount: activeConversation.messageCount,
        messages: activeConversation.messages,
      },
      isNew: false,
      pendingSummarization,
    };
  }

  // Create new conversation
  const newConversation = await prisma.conversation.create({
    data: {
      studentProfileId: profileId,
      mode,
      startedAt: now,
      lastMessageAt: now,
      messageCount: 0,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  // Update StudentContext stats
  await prisma.studentContext.upsert({
    where: { studentProfileId: profileId },
    update: {
      totalConversations: { increment: 1 },
      lastConversationAt: now,
    },
    create: {
      studentProfileId: profileId,
      totalConversations: 1,
      lastConversationAt: now,
    },
  });

  return {
    conversation: {
      id: newConversation.id,
      mode: newConversation.mode,
      startedAt: newConversation.startedAt,
      lastMessageAt: newConversation.lastMessageAt,
      messageCount: newConversation.messageCount,
      messages: newConversation.messages,
    },
    isNew: true,
    pendingSummarization,
  };
}

/**
 * Mark a conversation as ended.
 * This is called when the user navigates away or the session times out.
 */
export async function endConversation(conversationId: string): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      endedAt: new Date(),
    },
  });
}

/**
 * Update conversation after a message is sent.
 */
export async function updateConversationActivity(
  conversationId: string
): Promise<void> {
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      messageCount: { increment: 1 },
    },
  });
}

/**
 * Get conversations that need summarizing.
 * Used by the catch-up mechanism.
 */
export async function getConversationsNeedingSummary(
  limit: number = 10
): Promise<Array<{ id: string; studentProfileId: string }>> {
  const timeWindowStart = new Date(
    Date.now() - CONVERSATION_TIME_WINDOW_MS
  );

  return prisma.conversation.findMany({
    where: {
      summary: null,
      messageCount: { gt: 0 },
      OR: [
        { endedAt: { not: null } }, // Explicitly ended
        { lastMessageAt: { lt: timeWindowStart } }, // Timed out
      ],
    },
    select: {
      id: true,
      studentProfileId: true,
    },
    orderBy: {
      lastMessageAt: "asc", // Oldest first
    },
    take: limit,
  });
}

/**
 * Get the StudentContext for a profile, creating if needed.
 */
export async function getOrCreateStudentContext(profileId: string) {
  return prisma.studentContext.upsert({
    where: { studentProfileId: profileId },
    update: {},
    create: {
      studentProfileId: profileId,
    },
  });
}
