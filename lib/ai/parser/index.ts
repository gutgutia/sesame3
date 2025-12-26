// =============================================================================
// PARSER MODULE - Fast entity extraction using Kimi K2
// =============================================================================

import { generateText } from "ai";
import { modelFor } from "../providers";
import { buildParserPrompt } from "../prompts/parser-prompt";
import {
  ParserResponse,
  ParserContext,
  toolToWidgetType,
  WidgetType,
} from "./types";

export * from "./types";

/**
 * Parse a user message to extract entities, intents, and tool calls.
 * Uses Kimi K2 via Groq for fast (~50-100ms) parsing.
 */
export async function parseUserMessage(
  userMessage: string,
  context: ParserContext = {}
): Promise<ParserResponse> {
  const startTime = Date.now();
  
  try {
    const systemPrompt = buildParserPrompt({
      studentName: context.studentName,
      grade: context.grade,
      entryPoint: context.entryMode,
    });
    
    const { text } = await generateText({
      model: modelFor.fastParsing,
      system: systemPrompt,
      prompt: userMessage,
      temperature: 0.1, // Low temperature for consistent parsing
      maxOutputTokens: 500,   // Keep responses short
    });
    
    // Parse the JSON response
    const parsed = parseJsonResponse(text);
    
    if (!parsed || typeof parsed !== "object") {
      console.warn("[Parser] Invalid JSON response:", text.slice(0, 200));
      return createEmptyResponse();
    }
    
    console.log("[Parser] Raw parsed:", JSON.stringify(parsed).slice(0, 300));
    
    // Manually construct response to avoid Zod issues
    const response: ParserResponse = {
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      intents: Array.isArray(parsed.intents) ? parsed.intents : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      acknowledgment: typeof parsed.acknowledgment === "string" ? parsed.acknowledgment : undefined,
      widget: parsed.widget && typeof parsed.widget === "object" 
        ? { 
            type: (parsed.widget as Record<string, unknown>).type as WidgetType, 
            data: (parsed.widget as Record<string, unknown>).data as Record<string, unknown> || {}
          }
        : undefined,
      questions: Array.isArray(parsed.questions) ? parsed.questions : [],
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.8,
    };
    
    // Derive widget from tools if not explicitly set
    if (!response.widget && response.tools.length > 0) {
      const firstTool = response.tools[0];
      const widgetType = deriveWidgetType(firstTool.name, firstTool.args);
      response.widget = {
        type: widgetType,
        data: firstTool.args as Record<string, unknown>,
      };
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Parser] Completed in ${duration}ms, found ${response.entities.length} entities`);
    
    return response;
    
  } catch (error) {
    console.error("[Parser] Error:", error);
    return createEmptyResponse();
  }
}

/**
 * Parse JSON from the model's response, handling markdown code blocks
 */
function parseJsonResponse(text: string): Record<string, unknown> | null {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  
  cleaned = cleaned.trim();
  
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    // Try to find JSON object in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Derive the correct widget type from tool name and args
 */
function deriveWidgetType(toolName: string, args: Record<string, unknown>): WidgetType {
  if (toolName === "saveTestScores") {
    // Determine if it's SAT or ACT based on args
    if (args.actComposite || args.actEnglish || args.actMath) {
      return "act";
    }
    return "sat"; // Default to SAT
  }
  
  return toolToWidgetType[toolName] || "profile";
}

/**
 * Create an empty parser response (for fallback)
 */
function createEmptyResponse(): ParserResponse {
  return {
    entities: [],
    intents: [],
    tools: [],
    questions: [],
    confidence: 0,
  };
}

/**
 * Quick check if a message likely contains extractable data
 * Used to skip parsing for simple conversational messages
 */
export function shouldParse(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Skip very short messages unless they contain numbers
  if (message.length < 10 && !/\d/.test(message)) {
    return false;
  }
  
  // Keywords that suggest extractable data
  const dataKeywords = [
    // Test scores
    "sat", "act", "psat", "ap ", "score", "1[0-6]\\d{2}", "\\d{2}/36",
    // GPA
    "gpa", "grade point", "\\d\\.\\d",
    // Activities
    "president", "captain", "founder", "member", "club", "team", "volunteer",
    // Awards
    "award", "won", "winner", "finalist", "semifinalist", "national", "aime", "usamo",
    // Schools
    "mit", "stanford", "harvard", "yale", "princeton", "college", "university",
    // Profile
    "my name", "i'm in", "i am a", "junior", "senior", "sophomore", "freshman",
    // Courses
    "taking", "ap ", "ib ", "honors",
  ];
  
  const hasKeyword = dataKeywords.some(keyword => {
    if (keyword.includes("\\")) {
      return new RegExp(keyword, "i").test(lowerMessage);
    }
    return lowerMessage.includes(keyword);
  });
  
  return hasKeyword;
}

/**
 * Format parser results for the Advisor's context
 */
export function formatParserContextForAdvisor(response: ParserResponse): string {
  if (response.entities.length === 0 && response.questions.length === 0) {
    return "";
  }
  
  const parts: string[] = [];
  
  if (response.entities.length > 0) {
    const entitySummary = response.entities.map(e => {
      if (e.subtype) {
        return `${e.type}/${e.subtype}: ${e.value}`;
      }
      return `${e.type}: ${e.value}`;
    }).join(", ");
    parts.push(`[Extracted: ${entitySummary}]`);
  }
  
  if (response.widget) {
    parts.push(`[Widget shown: ${response.widget.type}]`);
  }
  
  if (response.questions.length > 0) {
    parts.push(`[Questions: ${response.questions.join("; ")}]`);
  }
  
  if (response.intents.length > 0) {
    parts.push(`[Intents: ${response.intents.join(", ")}]`);
  }
  
  return parts.join(" ");
}
