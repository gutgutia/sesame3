# Prompts

This directory contains all AI prompts used throughout the application.

## Structure

- `index.ts` - Re-exports all prompts for easy importing
- `story.ts` - Prompts for story capture (Share My Story feature)
- `advisor.ts` - General college advisor conversation prompts
- `extraction.ts` - Data extraction prompts (transcript OCR, etc.)

## Guidelines

### Writing Good Prompts

1. **Be specific about the role**: Start with who the AI is and what it's trying to do
2. **Define behavior clearly**: What should it do? What should it NOT do?
3. **Include examples when helpful**: Show don't tell
4. **Keep it focused**: One prompt, one purpose
5. **Use consistent formatting**: Markdown-style headers and bullets

### Template Functions

For prompts that need dynamic data, create a function:

```typescript
export function storyFollowUpPrompt(previousMessages: string): string {
  return `Based on this conversation:
${previousMessages}

Ask a thoughtful follow-up question to go deeper.`;
}
```

### Versioning

When making significant changes to a prompt:
1. Add a comment with the date and reason
2. Consider A/B testing important changes
3. Document any observed improvements/regressions

## Usage

```typescript
import { STORY_CAPTURE_SYSTEM, synthesizeStoryPrompt } from "@/lib/prompts";

// Use constant directly
const systemPrompt = STORY_CAPTURE_SYSTEM;

// Use template function
const prompt = synthesizeStoryPrompt(conversationText);
```

