// Prompts Module
// Exports all prompt templates

export {
  ADVISOR_BASE_PERSONA,
  ADVISOR_TOOL_INSTRUCTIONS,
  ADVISOR_PROMPT_TEMPLATE,
  buildAdvisorPrompt
} from "./advisor-prompt";

export {
  PARSER_BASE_INSTRUCTIONS,
  PARSER_PROMPT_TEMPLATE,
  buildParserPrompt
} from "./parser-prompt";

export {
  SECRETARY_PERSONA,
  SESAME_PERSONA,
  SECRETARY_SYSTEM_PROMPT,
  buildSecretaryPrompt,
} from "./secretary-prompt";
