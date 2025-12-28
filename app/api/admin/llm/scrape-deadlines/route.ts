import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import Anthropic from "@anthropic-ai/sdk";

const DEADLINE_EXTRACTION_PROMPT = `You are a helpful assistant that extracts college admissions deadline information.

Given a college/university name, search for and extract their application deadlines for the current admissions cycle.

Look for:
- Early Decision (ED) deadline
- Early Decision II (ED2) deadline
- Early Action (EA) deadline
- Restrictive Early Action (REA) deadline
- Regular Decision (RD) deadline
- Financial Aid deadline
- ED notification date
- EA notification date
- RD notification date
- Enrollment commitment deadline (usually May 1)

Return the data as JSON in this exact format:
{
  "deadlineEd": "YYYY-MM-DD" or null,
  "deadlineEd2": "YYYY-MM-DD" or null,
  "deadlineEa": "YYYY-MM-DD" or null,
  "deadlineRea": "YYYY-MM-DD" or null,
  "deadlineRd": "YYYY-MM-DD" or null,
  "deadlineFinancialAid": "YYYY-MM-DD" or null,
  "notificationEd": "YYYY-MM-DD" or null,
  "notificationEa": "YYYY-MM-DD" or null,
  "notificationRd": "YYYY-MM-DD" or null,
  "deadlineCommitment": "YYYY-MM-DD" or null,
  "confidence": "high" | "medium" | "low",
  "source": "URL where you found this information"
}

Only include dates you are confident about. Use null for any dates you cannot find or are uncertain about.
Return ONLY the JSON, no other text.`;

/**
 * POST /api/admin/llm/scrape-deadlines
 * Use LLM to search for and extract deadline information
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { type, name } = body as {
      type: "school" | "program";
      id: string;
      name: string;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build the search query
    const currentYear = new Date().getFullYear();
    const admissionsCycle = `${currentYear}-${currentYear + 1}`;

    let searchPrompt: string;
    if (type === "school") {
      searchPrompt = `Find the admissions deadlines for ${name} for the ${admissionsCycle} admissions cycle. Look for their official admissions website.`;
    } else {
      searchPrompt = `Find the application deadlines for the ${name} summer program for ${currentYear}. Look for their official program website.`;
    }

    // Use Claude to extract deadline information
    // Note: In production, you'd want to use web search or browsing capabilities
    // For now, we'll use Claude's knowledge (which may be outdated)
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `${DEADLINE_EXTRACTION_PROMPT}\n\nSchool/Program: ${name}\nAdmissions Cycle: ${admissionsCycle}\n\n${searchPrompt}`,
        },
      ],
    });

    // Extract the text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from LLM");
    }

    // Parse the JSON response
    let deadlines;
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        deadlines = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse LLM response:", textContent.text);
      return NextResponse.json(
        { error: "Failed to parse LLM response", raw: textContent.text },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deadlines,
      raw: textContent.text,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[LLM Scrape] Error:", error);
    return NextResponse.json(
      { error: "Failed to scrape deadlines" },
      { status: 500 }
    );
  }
}
