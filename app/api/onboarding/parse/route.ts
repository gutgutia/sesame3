/**
 * POST /api/onboarding/parse
 *
 * Uses LLM to intelligently parse user input during onboarding.
 * Supports parsing:
 * - Names: "my name is John Doe" -> { firstName: "John", lastName: "Doe" }
 * - High schools: "I go to Lincoln High in San Jose, CA" -> { name: "Lincoln High", city: "San Jose", state: "CA" }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { modelFor } from "@/lib/ai/providers";

type ParseType = "name" | "highSchool";

interface ParseRequest {
  type: ParseType;
  input: string;
}

interface NameResult {
  firstName: string;
  lastName?: string;
}

interface HighSchoolResult {
  name: string;
  city?: string;
  state?: string;
}

const NAME_PROMPT = `You are a name parser. Extract the first name and last name from the user's input.

Rules:
- If they say "my name is X" or "I'm X" or "call me X", extract X as the name
- If only one word, that's the first name (no last name)
- If multiple words, first word is firstName, rest is lastName
- Handle common phrases like "my name is", "I'm", "call me", "you can call me", etc.
- If the input is just a name without any preamble, parse it directly

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"firstName": "John", "lastName": "Doe"}

If no last name, omit it:
{"firstName": "John"}`;

const HIGH_SCHOOL_PROMPT = `You are a high school parser. Extract the school name, city, and state from the user's input.

Rules:
- Extract the school name (remove "high school" suffix if they include it, we'll add it back)
- If city is mentioned, extract it
- If state is mentioned, convert to 2-letter abbreviation (e.g., "California" -> "CA")
- Handle common phrases like "I go to", "I attend", "my school is", etc.
- US states only - use standard 2-letter abbreviations

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{"name": "Lincoln High School", "city": "San Jose", "state": "CA"}

If city/state not provided, omit them:
{"name": "Lincoln High School"}`;

export async function POST(request: NextRequest) {
  try {
    const body: ParseRequest = await request.json();
    const { type, input } = body;

    if (!type || !input) {
      return NextResponse.json(
        { error: "type and input are required" },
        { status: 400 }
      );
    }

    const prompt = type === "name" ? NAME_PROMPT : HIGH_SCHOOL_PROMPT;

    const { text } = await generateText({
      model: modelFor.onboardingParsing,
      system: prompt,
      prompt: `Parse this input: "${input}"`,
      maxOutputTokens: 100,
      temperature: 0, // Deterministic for parsing
    });

    // Parse the LLM response as JSON
    let result: NameResult | HighSchoolResult;
    try {
      // Clean up potential markdown formatting
      const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleanedText);
    } catch {
      // Fallback: if LLM doesn't return valid JSON, do simple parsing
      if (type === "name") {
        const words = input.replace(/^(my name is|i'm|call me|you can call me)\s*/i, "").trim().split(/\s+/);
        result = {
          firstName: words[0] || input,
          lastName: words.slice(1).join(" ") || undefined,
        };
      } else {
        result = {
          name: input,
        };
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Onboarding Parse] Error:", error);

    // Return a graceful fallback rather than erroring
    const body = await request.clone().json().catch(() => ({}));
    if (body.type === "name") {
      return NextResponse.json({ firstName: body.input || "Student" });
    }
    return NextResponse.json({ name: body.input || "High School" });
  }
}
