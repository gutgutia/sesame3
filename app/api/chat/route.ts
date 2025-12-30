import { streamText } from "ai";
import { NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  allTools,
  assembleContext,
  parseUserMessage,
  callSecretary,
  shouldParse,
  formatParserContextForAdvisor,
  getAdvisorForTier,
  getAdvisorModelName,
  getTierModelType,
  isRecommendationTool,
  getWidgetTypeFromToolName,
  executeToolCall,
  type EntryMode,
  type ParserResponse,
  type SecretaryResponse,
  type SubscriptionTier,
} from "@/lib/ai";
import {
  checkUsage,
  recordUsage,
  getUserIdFromProfile,
} from "@/lib/usage";
import { getFeatureFlags } from "@/lib/config";
import { getCachedContext, setCachedContext } from "@/lib/cache/context-cache";

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
    
    // === PHASE 1: Fast Parsing with Kimi K2 + Feature Flags (parallel) ===
    const parseStart = Date.now();

    // Get student profile for context (needed for secretary model)
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: { firstName: true, grade: true },
    });

    // Start feature flags fetch
    const featureFlags = await getFeatureFlags();

    // Prepare conversation history for secretary model
    const conversationHistory = validMessages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call secretary model or legacy parser based on feature flag
    let secretaryResult: SecretaryResponse | null = null;
    let parserResult: ParserResponse | null = null;

    if (featureFlags.enableSecretaryModel && isUserMessage) {
      // NEW: Secretary model handles routing decision
      secretaryResult = await callSecretary(userInput, {
        studentName: studentProfile?.firstName,
        grade: studentProfile?.grade || undefined,
        entryMode: mode,
        conversationHistory: conversationHistory.slice(0, -1), // Exclude current message (it's in userInput)
      });
      console.log(`[Chat] Secretary completed in ${Date.now() - parseStart}ms, canHandle: ${secretaryResult.canHandle}`);
    } else if (isUserMessage && shouldParse(userInput, mode)) {
      // LEGACY: Stateless parser (fallback)
      parserResult = await parseUserMessage(userInput, { entryMode: mode });
      console.log(`[Chat] Parser completed in ${Date.now() - parseStart}ms`);
    }

    // Merge secretary result into parser result for compatibility
    // (widgets, tools, entities are the same structure)
    if (secretaryResult) {
      parserResult = {
        entities: secretaryResult.entities,
        intents: secretaryResult.intents,
        tools: secretaryResult.tools,
        widgets: secretaryResult.widgets,
        widget: secretaryResult.widget,
        acknowledgment: secretaryResult.acknowledgment,
        questions: secretaryResult.questions,
        confidence: secretaryResult.confidence,
      };
    }

    const parserTokens = parserResult || secretaryResult
      ? { input: Math.ceil(userInput.length / 4) + 200, output: 100 }
      : { input: 0, output: 0 };

    // === PHASE 2: Start SSE Stream IMMEDIATELY - Send widgets before context assembly ===
    const encoder = new TextEncoder();
    let totalOutputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send widget data IMMEDIATELY after parsing (before context assembly)
          // This ensures widgets appear in ~600ms, not 3+ seconds
          if (featureFlags.enableWidgets && parserResult?.widgets && parserResult.widgets.length > 0) {
            console.log(`[Chat] Sending ${parserResult.widgets.length} widget(s) immediately`);
            for (const widget of parserResult.widgets) {
              const widgetEvent = JSON.stringify({
                type: "widget",
                widget: widget,
              });
              const sseMessage = `event: widget\ndata: ${widgetEvent}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));
            }
          } else if (featureFlags.enableWidgets && parserResult?.widget) {
            // Fallback to legacy single widget for backward compat
            const widgetEvent = JSON.stringify({
              type: "widget",
              widget: parserResult.widget,
            });
            const sseMessage = `event: widget\ndata: ${widgetEvent}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          }

          // ==========================================================================
          // ROUTING DECISION: Secretary handles vs Claude escalation
          // ==========================================================================
          if (secretaryResult?.canHandle && secretaryResult.response) {
            // === FAST PATH: Secretary (Kimi K2) handles this interaction ===
            console.log(`[Chat] Secretary handling response directly`);

            // Execute tool calls from secretary
            if (secretaryResult.tools && secretaryResult.tools.length > 0) {
              for (const tool of secretaryResult.tools) {
                try {
                  await executeToolCall(profileId, tool.name, tool.args);
                  console.log(`[Chat] Executed tool: ${tool.name}`);
                } catch (err) {
                  console.error(`[Chat] Tool execution error for ${tool.name}:`, err);
                }
              }
            }

            // Stream secretary's response
            controller.enqueue(encoder.encode(secretaryResult.response));

            // Record usage for secretary
            await recordUsage({
              userId,
              model: "kimi_k2",
              tokensInput: parserTokens.input,
              tokensOutput: Math.ceil(secretaryResult.response.length / 4),
              messageCount: 1,
            }).catch(err => console.error("Error recording secretary usage:", err));

            // Save conversation
            saveConversation({
              profileId,
              conversationId,
              mode,
              messages,
              assistantText: secretaryResult.response,
              toolCalls: secretaryResult.tools,
              parserResult,
              modelName: "kimi-k2",
              tokensUsed: parserTokens.input + Math.ceil(secretaryResult.response.length / 4),
            }).catch(err => console.error("Error saving conversation:", err));

            controller.close();
            return;
          }

          // === SLOW PATH: Escalate to Claude for complex reasoning ===
          if (secretaryResult && !secretaryResult.canHandle) {
            console.log(`[Chat] Escalating to Claude: ${secretaryResult.escalationReason || "complex reasoning needed"}`);
          }

          // === Get context (from cache if available, otherwise assemble) ===
          const contextStart = Date.now();
          let context = getCachedContext(profileId);
          let cacheHit = !!context;

          if (!context) {
            // Cache miss - assemble fresh context
            context = await assembleContext({
              profileId,
              mode: mode as EntryMode,
              messages: validMessages.map((m: { role: string; content: string }) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
              sessionStartTime: new Date(),
            });
            // Cache for next request
            setCachedContext(profileId, context);
          }
          console.log(`[Chat] Context ${cacheHit ? "CACHE HIT" : "assembled"} in ${Date.now() - contextStart}ms`);

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
