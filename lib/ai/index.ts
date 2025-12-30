// AI Module - Main exports

// Model providers
export { 
  models, 
  modelFor, 
  getAvailableProviders, 
  getModelWithFallback,
  getAdvisorForTier,
  getAdvisorModelName,
  getTierModelType,
  type SubscriptionTier,
} from "./providers";

// Tools
export {
  allTools,
  profileTools,
  planningTools,
  recommendationTools,
  getWidgetTypeFromToolName,
  isRecommendationTool,
} from "./tools";
export { executeToolCall } from "./tool-handlers";

// Parser (NEW - Kimi K2)
export {
  parseUserMessage,
  callSecretary,
  shouldParse,
  formatParserContextForAdvisor,
  type ParserResponse,
  type SecretaryResponse,
  type ParserContext,
  type ExtractedEntity,
  type WidgetType,
} from "./parser";

// Context assembly
export { 
  assembleContext, 
  assembleContextSimple,
  buildProfileNarrative,
  buildEntryContext,
  buildConversationState,
  buildConversationSummary,
  buildCounselorObjectives,
  type AssembleContextParams,
  type AssembledContext,
  type EntryMode,
  type Message,
} from "./context";

// Prompts
export {
  ADVISOR_BASE_PERSONA,
  ADVISOR_PROMPT_TEMPLATE,
  buildAdvisorPrompt,
  PARSER_BASE_INSTRUCTIONS,
  PARSER_PROMPT_TEMPLATE,
  buildParserPrompt,
} from "./prompts";

// Legacy exports (for backwards compatibility)
export { ADVISOR_SYSTEM_PROMPT, FAST_PARSER_PROMPT, buildProfileContext, SUMMARIZATION_PROMPT } from "./prompts.legacy";
