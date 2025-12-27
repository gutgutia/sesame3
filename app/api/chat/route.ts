import { streamText } from "ai";
import { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  allTools,
  assembleContext,
  parseUserMessage,
  shouldParse,
  formatParserContextForAdvisor,
  getAdvisorForTier,
  getAdvisorModelName,
  getTierModelType,
  isRecommendationTool,
  getWidgetTypeFromToolName,
  type EntryMode,
  type ParserResponse,
  type SubscriptionTier,
} from "@/lib/ai";
import {
  checkUsage,
  recordUsage,
  getUserIdFromProfile,
} from "@/lib/usage";
import { getFeatureFlags } from "@/lib/config";

export const maxDuration = 60; // Allow up to 60 seconds for streaming

/**
 * POST /api/chat
 * Main chat endpoint with Parser + Advisor dual-model architecture
 * 
 * Flow:
 * 1. Check usage limits
 * 2. Parser (Kimi K2, ~50ms) extracts entities and determines widgets
 * 3. Widget data sent immediately via SSE
 * 4. Advisor (tier-based Claude model) streams response
 * 5. Track usage after completion
 */
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const { messages, conversationId, mode = "general" } = await request.json();
    
    // Get user ID for usage tracking
    const userId = await getUserIdFromProfile(profileId);
    if (!userId) {
      return new Response("User not found", { status: 401 });
    }
    
    // === CHECK USAGE LIMITS ===
    const usageCheck = await checkUsage(userId);
    if (!usageCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "usage_limit_exceeded",
          message: usageCheck.reason,
          usage: usageCheck.usage,
          resetTime: usageCheck.resetTime,
        }),
        { 
          status: 429,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    
    // Get user's subscription tier for model selection
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true },
    });
    const tier = (user?.subscriptionTier as SubscriptionTier) || "free";
    const advisorModel = getAdvisorForTier(tier);
    const modelName = getAdvisorModelName(tier);
    const modelType = getTierModelType(tier);
    
    console.log(`[Chat] User tier: ${tier}, using model: ${modelName}`);
    
    // Filter out any messages with empty content
    const validMessages = messages.filter(
      (m: { role: string; content: string }) => m.content && m.content.trim() !== ""
    );
    
    if (validMessages.length === 0) {
      return new Response("No valid messages", { status: 400 });
    }
    
    // Get the latest user message
    const lastMessage = validMessages[validMessages.length - 1];
    const isUserMessage = lastMessage?.role === "user";
    const userInput = isUserMessage ? lastMessage.content : "";
    
    // === PHASE 1: Fast Parsing with Kimi K2 ===
    let parserResult: ParserResponse | null = null;
    let parserTokens = { input: 0, output: 0 };
    
    if (isUserMessage && shouldParse(userInput)) {
      console.log("[Chat] Parsing user message...");
      const parseStart = Date.now();
      
      parserResult = await parseUserMessage(userInput, {
        entryMode: mode,
      });
      
      // Estimate parser tokens (rough estimate: 4 chars = 1 token)
      parserTokens = {
        input: Math.ceil(userInput.length / 4) + 100, // +100 for system prompt
        output: 50, // Parser output is small
      };
      
      console.log(`[Chat] Parser completed in ${Date.now() - parseStart}ms`);
    }
    
    // === PHASE 2: Assemble Context for Advisor ===
    const context = await assembleContext({
      profileId,
      mode: mode as EntryMode,
      messages: validMessages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      sessionStartTime: new Date(),
    });
    
    // Inject parser context into the system prompt
    let advisorPrompt = context.advisorPrompt;
    if (parserResult) {
      const parserContext = formatParserContextForAdvisor(parserResult);
      if (parserContext) {
        advisorPrompt += `\n\n## Parser Analysis\n${parserContext}`;
      }
    }
    
    // Estimate input tokens for advisor
    const estimatedInputTokens = Math.ceil(
      (advisorPrompt.length + validMessages.reduce((acc: number, m: { content: string }) => acc + m.content.length, 0)) / 4
    );
    
    // === PHASE 3: Create SSE Stream with Widget + Advisor Response ===
    const encoder = new TextEncoder();
    let totalOutputTokens = 0;
    
    // Check if widgets are enabled (feature flag)
    const featureFlags = await getFeatureFlags();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send widget data first (if detected AND widgets are enabled)
          if (featureFlags.enableWidgets && parserResult?.widget) {
            const widgetEvent = JSON.stringify({
              type: "widget",
              widget: parserResult.widget,
            });
            const sseMessage = `event: widget\ndata: ${widgetEvent}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          }
          
          // Stream the Advisor response
          const result = streamText({
            model: advisorModel,
            system: advisorPrompt,
            messages: validMessages,
            tools: allTools,
            onFinish: async ({ text, toolCalls, toolResults, usage }) => {
              // Estimate output tokens
              totalOutputTokens = usage?.outputTokens || Math.ceil(text.length / 4);
              const actualInputTokens = usage?.inputTokens || estimatedInputTokens;

              // Record usage for advisor
              await recordUsage({
                userId,
                model: modelType,
                tokensInput: actualInputTokens,
                tokensOutput: totalOutputTokens,
                messageCount: 1,
              }).catch(err => console.error("Error recording advisor usage:", err));

              // Record usage for parser (if used)
              if (parserTokens.input > 0) {
                await recordUsage({
                  userId,
                  model: "kimi_k2",
                  tokensInput: parserTokens.input,
                  tokensOutput: parserTokens.output,
                  messageCount: 0, // Don't double-count messages
                }).catch(err => console.error("Error recording parser usage:", err));
              }

              // Save to database in background
              saveConversation({
                profileId,
                conversationId,
                mode,
                messages,
                assistantText: text,
                toolCalls,
                toolResults,
                parserResult,
                modelName,
                tokensUsed: actualInputTokens + totalOutputTokens,
              }).catch(err => console.error("Error saving conversation:", err));
            },
          });

          // Use fullStream to capture both text and tool calls
          const fullStream = result.fullStream;

          // Stream events - handle text and tool calls
          for await (const event of fullStream) {
            if (event.type === "text-delta") {
              // Stream text chunks - AI SDK v5 uses 'text' property
              if (event.text) {
                controller.enqueue(encoder.encode(event.text));
              }
            } else if (event.type === "tool-call") {
              // Handle tool calls - emit widget events for recommendation tools
              const toolName = event.toolName;
              if (featureFlags.enableWidgets && isRecommendationTool(toolName)) {
                const widgetType = getWidgetTypeFromToolName(toolName);
                if (widgetType) {
                  // Build widget data from tool input (AI SDK v5 uses 'input' not 'args')
                  const widgetData: Record<string, unknown> = {};
                  const input = "input" in event ? event.input : {};
                  if (toolName === "showSchoolRecommendations") {
                    // Pass school names to the widget for API lookup
                    widgetData.schools = (input as { schools?: string[] }).schools || [];
                    widgetData.reason = (input as { reason?: string }).reason;
                  } else if (toolName === "showProgramRecommendations") {
                    // Pass program names to the widget for API lookup
                    widgetData.programs = (input as { programs?: string[] }).programs || [];
                    widgetData.reason = (input as { reason?: string }).reason;
                  }

                  const widgetEvent = JSON.stringify({
                    type: "widget",
                    widget: {
                      type: widgetType,
                      data: widgetData,
                    },
                  });
                  controller.enqueue(encoder.encode(`event: widget\ndata: ${widgetEvent}\n\n`));
                }
              }
            }
          }
          
          controller.close();
        } catch (error) {
          console.error("[Chat] Stream error:", error);
          controller.error(error);
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
    
  } catch (error) {
    console.error("Chat error:", error);
    if (error instanceof Error && error.message === "Profile not found") {
      return new Response("Not authenticated", { status: 401 });
    }
    return new Response("Internal server error", { status: 500 });
  }
}

/**
 * Save conversation to database (runs in background)
 */
async function saveConversation({
  profileId,
  conversationId,
  mode,
  messages,
  assistantText,
  toolCalls,
  toolResults,
  parserResult,
  modelName,
  tokensUsed,
}: {
  profileId: string;
  conversationId?: string;
  mode: string;
  messages: Array<{ role: string; content: string }>;
  assistantText: string;
  toolCalls?: unknown;
  toolResults?: unknown;
  parserResult?: ParserResponse | null;
  modelName: string;
  tokensUsed?: number;
}) {
  try {
    let conversation;
    
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    }
    
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          studentProfileId: profileId,
          title: messages[0]?.content?.slice(0, 50) || "New conversation",
          mode: mode || "general",
        },
      });
    }
    
    // Save user message
    const userMessage = messages[messages.length - 1];
    if (userMessage?.role === "user") {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: typeof userMessage.content === "string" 
            ? userMessage.content 
            : JSON.stringify(userMessage.content),
          parsedIntents: parserResult?.intents,
          parsedEntities: parserResult?.entities as unknown as undefined,
        },
      });
    }
    
    // Save assistant message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: assistantText,
        toolCalls: toolCalls ? JSON.parse(JSON.stringify(toolCalls)) : undefined,
        toolResults: toolResults ? JSON.parse(JSON.stringify(toolResults)) : undefined,
        widgetType: parserResult?.widget?.type,
        widgetData: parserResult?.widget?.data as unknown as undefined,
        model: modelName,
        provider: "anthropic",
        tokensUsed,
      },
    });
    
    // Update conversation stats
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 2 },
      },
    });
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
}
