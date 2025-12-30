# Secretary Architecture Implementation Plan

## Overview

Replace the current "dumb parser + Claude" architecture with an **intelligent secretary model** where Kimi K2 handles most interactions and only escalates to Claude for complex reasoning.

---

## Current State (Problems)

1. Kimi K2 used as stateless parser - no conversation context
2. Kimi doesn't know previous question was "What's your name?" when user says "Vansh"
3. Widget generation relies on keyword matching, not intelligence
4. Claude called for every response, even simple data confirmations
5. Two models that don't coordinate intelligently

---

## Target State

```
User Message
    ↓
Kimi K2 (sees FULL conversation history)
    ↓
Decision: Can I handle this?
    ├── YES → Kimi generates response + widgets
    │         → Save to conversation
    │         → Return to user (~600ms)
    │
    └── NO  → Pass to Claude (with full history)
              → Claude generates response
              → Save to conversation
              → Return to user (~3-5s)
```

---

## Implementation Steps

### Phase 1: Give Kimi Conversation Context

**Goal**: Kimi sees full conversation history, not just the last message.

**Files to modify**:
- `lib/ai/parser/index.ts` - Update `parseUserMessage` to accept conversation history
- `lib/ai/prompts/parser-prompt.ts` - Update prompt to include conversation context
- `app/api/chat/route.ts` - Pass conversation history to parser

**Changes**:
```typescript
// Before
parseUserMessage(userInput, { entryMode: mode })

// After
parseUserMessage(userInput, {
  entryMode: mode,
  conversationHistory: validMessages, // Full history
})
```

**Parser prompt update**:
```
You are Sesame's secretary. You see the full conversation.

Conversation so far:
{history}

Latest message: {userInput}

Based on context, extract any data and decide if you can handle this.
```

---

### Phase 2: Kimi Decides to Handle or Escalate

**Goal**: Kimi makes intelligent routing decisions.

**Add to parser response**:
```typescript
interface ParserResponse {
  // Existing fields...

  // New fields
  canHandle: boolean;           // Can Kimi handle this alone?
  escalationReason?: string;    // Why escalate to Claude?
  suggestedResponse?: string;   // Kimi's response if handling
}
```

**Escalation criteria** (in Kimi's prompt):
```
Escalate to Claude if the user is asking for:
- Strategic advice ("Should I apply ED?", "What are my chances?")
- Essay help or review
- School/program comparisons requiring analysis
- Personalized recommendations based on profile
- Complex multi-factor decisions
- Emotional support or encouragement beyond simple acknowledgment

Handle yourself if:
- User is providing data (name, grade, scores, activities)
- User is confirming or correcting information
- Simple yes/no or factual questions
- Adding items to lists (schools, programs)
- Basic greetings or acknowledgments
```

---

### Phase 3: Kimi Generates Responses

**Goal**: When Kimi handles, it generates the full response (not just parsing).

**New Kimi response structure**:
```typescript
interface KimiResponse {
  // Routing
  canHandle: boolean;
  escalationReason?: string;

  // If handling
  response?: string;            // The message to show user
  widgets?: Widget[];           // Any widgets to display
  toolCalls?: ToolCall[];       // Database operations to perform

  // Always extracted
  entities?: Entity[];          // For context building
}
```

**Example Kimi handling**:
```
User: "Vansh"
Kimi sees: Previous message was "What should I call you?"

Kimi returns:
{
  canHandle: true,
  response: "Nice to meet you, Vansh! What grade are you in?",
  widgets: [{ type: "name", data: { firstName: "Vansh" }}],
  toolCalls: [{ name: "saveName", args: { firstName: "Vansh" }}]
}
```

---

### Phase 4: Update Chat Route for Routing

**Goal**: Chat route handles both Kimi-only and Kimi→Claude paths.

**New flow in `app/api/chat/route.ts`**:
```typescript
// 1. Call Kimi with full context
const kimiResult = await callKimi(userInput, conversationHistory, mode);

// 2. Check if Kimi can handle
if (kimiResult.canHandle) {
  // Kimi handles - fast path (~600ms)

  // Send widgets immediately
  for (const widget of kimiResult.widgets) {
    sendWidget(controller, widget);
  }

  // Execute tool calls
  for (const toolCall of kimiResult.toolCalls) {
    await executeToolCall(toolCall);
  }

  // Stream Kimi's response
  streamResponse(controller, kimiResult.response);

} else {
  // Escalate to Claude - slow path (~3-5s)

  // Still send any widgets Kimi detected
  for (const widget of kimiResult.widgets) {
    sendWidget(controller, widget);
  }

  // Call Claude with full context
  const claudeResult = await streamText({
    model: claudeModel,
    system: advisorPrompt,
    messages: conversationHistory,
    tools: allTools,
  });

  // Stream Claude's response
  for await (const chunk of claudeResult.textStream) {
    streamChunk(controller, chunk);
  }
}
```

---

### Phase 5: Unified Persona

**Goal**: Both models sound like the same "Sesame" advisor.

**Shared persona prompt** (used by both Kimi and Claude):
```
You are Sesame, a warm and knowledgeable college prep advisor.

Voice:
- Calm, supportive, never condescending
- Use the student's name when known
- Keep responses concise but helpful
- "College prep without the panic" - reassuring tone

Style:
- Short paragraphs, easy to read
- Use bullet points for lists
- Ask one follow-up question at a time
- Celebrate small wins
```

**Files to update**:
- `lib/ai/prompts/parser-prompt.ts` - Add persona for Kimi responses
- `lib/ai/prompts/advisor-prompt.ts` - Already has persona (keep consistent)

---

### Phase 6: Testing & Refinement

**Test cases**:

| Input | Expected Handler | Expected Output |
|-------|-----------------|-----------------|
| "Vansh" (after name question) | Kimi | Name widget + greeting |
| "10th grade" | Kimi | Grade widget + follow-up |
| "Add Stanford to my list" | Kimi | School widget + confirmation |
| "What are my chances at MIT?" | Claude | Detailed analysis |
| "Should I do ED or EA?" | Claude | Strategic advice |
| "My SAT is 1520" | Kimi | SAT widget + encouragement |
| "I'm stressed about applications" | Claude | Supportive response |

**Logging to add**:
```
[Kimi] Handling: "Vansh" (reason: data extraction)
[Kimi] Escalating: "What are my chances?" (reason: strategic advice needed)
[Claude] Responding to escalated query
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `lib/ai/parser/index.ts` | Accept history, return canHandle + response |
| `lib/ai/parser/types.ts` | Add new response fields |
| `lib/ai/prompts/parser-prompt.ts` | Full secretary prompt with persona |
| `app/api/chat/route.ts` | Routing logic for Kimi vs Claude |
| `lib/ai/prompts/advisor-prompt.ts` | Ensure persona matches Kimi |

---

## Migration Strategy

1. **Phase 1-2 first**: Get Kimi seeing context and making routing decisions
2. **Test routing**: Verify escalation works correctly before Kimi generates responses
3. **Phase 3-4**: Enable Kimi response generation
4. **Phase 5-6**: Polish persona consistency and test edge cases

---

## Rollback Plan

Keep feature flag:
```typescript
const USE_SECRETARY_MODEL = process.env.USE_SECRETARY_MODEL === "true";

if (USE_SECRETARY_MODEL) {
  // New secretary architecture
} else {
  // Old parser + Claude architecture
}
```

---

## Success Metrics

1. **Speed**: Simple interactions complete in <1s (currently 3-5s)
2. **Quality**: No degradation in response quality for complex queries
3. **Cost**: 50%+ reduction in Claude token usage
4. **Correctness**: Widgets appear for all data extraction cases
