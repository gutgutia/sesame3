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
    // === PHASE 0: Parse request + get profile IN PARALLEL ===
    const [profileId, body] = await Promise.all([
      requireProfile(),
      request.json(),
    ]);
    const { messages, conversationId, mode = "general" } = body;

    // Get user ID and check usage IN PARALLEL
    const userId = await getUserIdFromProfile(profileId);
    if (!userId) {
      return new Response("User not found", { status: 401 });
    }

    // Run usage check and user tier fetch IN PARALLEL
    const [usageCheck, user] = await Promise.all([
      checkUsage(userId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionTier: true },
      }),
    ]);

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
    
    // === PHASE 1: Fast Parsing with Kimi K2 + Feature Flags (ACTUALLY parallel now) ===
    const parseStart = Date.now();

    // Prepare conversation history for secretary model (sync, no await)
    const conversationHistory = validMessages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Run student profile fetch and feature flags fetch IN PARALLEL
    const [studentProfile, featureFlags] = await Promise.all([
      prisma.studentProfile.findUnique({
        where: { id: profileId },
        select: { firstName: true, grade: true },
      }),
      getFeatureFlags(),
    ]);

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
      console.log(`\n========== CHAT REQUEST ==========`);
      console.log(`[Chat] Mode: ${mode}`);
      console.log(`[Chat] User: "${userInput.substring(0, 100)}${userInput.length > 100 ? '...' : ''}"`);
      console.log(`[Chat] Secretary completed in ${Date.now() - parseStart}ms`);
      console.log(`[Chat] Can Handle: ${secretaryResult.canHandle}`);
      console.log(`[Chat] Widgets: ${secretaryResult.widgets?.length || 0}`, secretaryResult.widgets?.map(w => w.type) || []);
      console.log(`[Chat] Tools: ${secretaryResult.tools?.length || 0}`, secretaryResult.tools?.map(t => t.name) || []);
      if (!secretaryResult.canHandle) {
        console.log(`[Chat] Escalation Reason: ${secretaryResult.escalationReason || 'not specified'}`);
      }
    } else if (isUserMessage && shouldParse(userInput, mode)) {
      // LEGACY: Stateless parser (fallback)
      parserResult = await parseUserMessage(userInput, { entryMode: mode });
      console.log(`\n========== CHAT REQUEST (LEGACY PARSER) ==========`);
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
          // Determine if secretary will handle (auto-save) or if we need user confirmation
          const secretaryWillHandle = secretaryResult?.canHandle && secretaryResult.response;

          // Send widget data IMMEDIATELY after parsing (before context assembly)
          // This ensures widgets appear in ~600ms, not 3+ seconds
          // NOTE: If secretary handles, widgets are sent as "saved" (server executes tools)
          //       If escalating to Claude, widgets are sent as "pending" (need user confirmation)
          if (featureFlags.enableWidgets && parserResult?.widgets && parserResult.widgets.length > 0) {
            console.log(`[Chat] Sending ${parserResult.widgets.length} widget(s) immediately (saved: ${secretaryWillHandle})`);
            for (const widget of parserResult.widgets) {
              console.log(`[Chat] Widget: type=${widget.type}, data=${JSON.stringify(widget.data || {})}`);
              const widgetEvent = JSON.stringify({
                type: "widget",
                widget: widget,
                // Mark as already saved if secretary is handling (server executes tools)
                saved: secretaryWillHandle,
              });
              const sseMessage = `event: widget\ndata: ${widgetEvent}\n\n`;
              controller.enqueue(encoder.encode(sseMessage));
            }
          } else if (featureFlags.enableWidgets && parserResult?.widget) {
            // Fallback to legacy single widget for backward compat
            const widgetEvent = JSON.stringify({
              type: "widget",
              widget: parserResult.widget,
              saved: secretaryWillHandle,
            });
            const sseMessage = `event: widget\ndata: ${widgetEvent}\n\n`;
            controller.enqueue(encoder.encode(sseMessage));
          }

          // ==========================================================================
          // ROUTING DECISION: Secretary handles vs Claude escalation
          // ==========================================================================
          if (secretaryResult?.canHandle && secretaryResult.response) {
            // === FAST PATH: Secretary (Kimi K2) handles this interaction ===
            console.log(`[Chat] 🤖 RESPONDING: Kimi K2 (Secretary) - Fast Path`);
            console.log(`[Chat] Response preview: "${secretaryResult.response.substring(0, 80)}..."`);
            console.log(`======================================\n`);

            // Capture values for background tasks
            const responseText = secretaryResult.response;
            const toolsToExecute = secretaryResult.tools || [];

            // Stream secretary's response IMMEDIATELY (no blocking operations!)
            controller.enqueue(encoder.encode(responseText));
            controller.close();

            // Fire-and-forget: Use setImmediate to truly detach from request lifecycle
            // This ensures the response is sent BEFORE any background work starts
            setImmediate(() => {
              (async () => {
                // Execute tool calls
                for (const tool of toolsToExecute) {
                  try {
                    await executeToolCall(profileId, tool.name, tool.args);
                    console.log(`[Chat] Executed tool: ${tool.name}`);
                  } catch (err) {
                    console.error(`[Chat] Tool execution error for ${tool.name}:`, err);
                  }
                }

                // Record usage and save conversation in parallel
                await Promise.all([
                  recordUsage({
                    userId,
                    model: "kimi_k2",
                    tokensInput: parserTokens.input,
                    tokensOutput: Math.ceil(responseText.length / 4),
                    messageCount: 1,
                  }).catch(err => console.error("Error recording secretary usage:", err)),
                  saveConversation({
                    profileId,
                    conversationId,
                    mode,
                    messages,
                    assistantText: responseText,
                    toolCalls: toolsToExecute,
                    parserResult,
                    modelName: "kimi-k2",
                    tokensUsed: parserTokens.input + Math.ceil(responseText.length / 4),
                  }).catch(err => console.error("Error saving conversation:", err)),
                ]);
              })().catch(err => console.error("Error in background tasks:", err));
            });

            return;
          }

          // === SLOW PATH: Escalate to Claude for complex reasoning ===
          console.log(`[Chat] 🧠 RESPONDING: Claude (${modelName}) - Slow Path`);
          if (secretaryResult && !secretaryResult.canHandle) {
            console.log(`[Chat] Escalation reason: ${secretaryResult.escalationReason || "complex reasoning needed"}`);
          }
          console.log(`======================================\n`);

          // === Get context (use lightweight for onboarding, full for everything else) ===
          const contextStart = Date.now();
          let advisorPrompt: string;
          let cacheHit = false;

          // For onboarding mode, use a lightweight prompt - don't load full profile
          if (mode === "onboarding") {
            advisorPrompt = buildOnboardingPrompt(studentProfile?.firstName, studentProfile?.grade || undefined);
            console.log(`[Chat] Using lightweight onboarding prompt`);
          } else {
            // For other modes, use full context (from cache if available)
            let context = getCachedContext(profileId);
            cacheHit = !!context;

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
            advisorPrompt = context.advisorPrompt;
          }
          console.log(`[Chat] Context ${mode === "onboarding" ? "LIGHTWEIGHT" : cacheHit ? "CACHE HIT" : "assembled"} in ${Date.now() - contextStart}ms`);

          // Inject parser context into the system prompt
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
              // Log Claude's response
              console.log(`[Chat] Claude response complete (${text.length} chars)`);
              console.log(`[Chat] Claude response preview: "${text.substring(0, 100)}..."`);
              if (toolCalls && toolCalls.length > 0) {
                console.log(`[Chat] Claude tool calls: ${toolCalls.map(t => t.toolName).join(", ")}`);
              }

              // Estimate output tokens
              totalOutputTokens = usage?.outputTokens || Math.ceil(text.length / 4);
              const actualInputTokens = usage?.inputTokens || estimatedInputTokens;

              // Fire-and-forget: record usage and save conversation
              // These don't need to block since onFinish runs after stream is complete
              recordUsage({
                userId,
                model: modelType,
                tokensInput: actualInputTokens,
                tokensOutput: totalOutputTokens,
                messageCount: 1,
              }).catch(err => console.error("Error recording advisor usage:", err));

              if (parserTokens.input > 0) {
                recordUsage({
                  userId,
                  model: "kimi_k2",
                  tokensInput: parserTokens.input,
                  tokensOutput: parserTokens.output,
                  messageCount: 0,
                }).catch(err => console.error("Error recording parser usage:", err));
              }

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
    // Get or create conversation
    let conversation = conversationId
      ? await prisma.conversation.findUnique({ where: { id: conversationId } })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          studentProfileId: profileId,
          title: messages[0]?.content?.slice(0, 50) || "New conversation",
          mode: mode || "general",
        },
      });
    }

    // Save both messages AND update stats IN PARALLEL
    const userMessage = messages[messages.length - 1];
    const dbOps: Promise<unknown>[] = [
      // Update conversation stats
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          messageCount: { increment: 2 },
        },
      }),
      // Save assistant message
      prisma.message.create({
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
      }),
    ];

    // Add user message if present
    if (userMessage?.role === "user") {
      dbOps.push(
        prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "user",
            content: typeof userMessage.content === "string"
              ? userMessage.content
              : JSON.stringify(userMessage.content),
            parsedIntents: parserResult?.intents,
            parsedEntities: parserResult?.entities as unknown as undefined,
          },
        })
      );
    }

    await Promise.all(dbOps);
  } catch (error) {
    console.error("Error saving conversation:", error);
  }
}

/**
 * Build a lightweight prompt for onboarding mode.
 * This avoids expensive database queries for new users who have no data yet.
 */
function buildOnboardingPrompt(firstName?: string | null, grade?: string): string {
  const studentName = firstName || "there";
  const gradeInfo = grade ? ` (${grade})` : "";

  return `You are Sesame, a warm and supportive AI college counselor helping a high school student${gradeInfo} named ${studentName} get started with their college prep journey.

## Your Personality
- Warm, encouraging, and genuinely invested in the student's success
- Knowledgeable but approachable - explain complex things simply
- Empathetic - recognize that college admissions can be stressful
- Proactive - help them understand what they should be focusing on

## Current Context
This is an onboarding conversation. The student is new and exploring what Sesame can help them with.

## Response Style
- Keep responses concise (2-4 sentences) but warm
- Use their name when you know it
- ALWAYS end with a question to keep the conversation flowing
- Be conversational, not robotic
- Help them understand what they should prioritize at their stage

## What You Should NOT Do
- Don't overwhelm with too many questions at once
- Don't be preachy or lecture-y
- Don't use excessive exclamation points`;
}
