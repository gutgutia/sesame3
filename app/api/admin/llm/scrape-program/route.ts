import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { modelFor } from "@/lib/ai/providers";

// Schema for summer program extraction
const ProgramExtractionSchema = z.object({
  // Application timeline
  applicationOpens: z.string().nullable().describe("When applications open (YYYY-MM-DD format)"),
  applicationDeadline: z.string().nullable().describe("Application deadline (YYYY-MM-DD format)"),
  isRolling: z.boolean().describe("Does this program have rolling admissions?"),
  rollingNotes: z.string().nullable().describe("Notes about rolling admissions if applicable"),

  // Eligibility
  minGrade: z.number().nullable().describe("Minimum grade level (9, 10, 11, or 12)"),
  maxGrade: z.number().nullable().describe("Maximum grade level (9, 10, 11, or 12)"),
  minAge: z.number().nullable().describe("Minimum age requirement"),
  maxAge: z.number().nullable().describe("Maximum age requirement"),
  eligibilityNotes: z.string().nullable().describe("Complex eligibility requirements (e.g., 'Must turn 16 by December 31', 'First-generation only')"),

  // Application requirements
  applicationNotes: z.string().nullable().describe("Application requirements (e.g., 'Requires 2 recommendations, transcript, essay')"),

  // Program details
  format: z.enum(["residential", "commuter", "online", "hybrid"]).nullable().describe("Program format"),
  location: z.string().nullable().describe("Program location (e.g., 'Stanford, CA')"),

  // Sessions
  sessions: z.array(z.object({
    name: z.string().describe("Session name (e.g., 'Session 1', 'Summer A')"),
    startDate: z.string().describe("Session start date (YYYY-MM-DD format)"),
    endDate: z.string().describe("Session end date (YYYY-MM-DD format)"),
  })).describe("Program sessions with dates"),

  // Tracks/programs offered
  llmContext: z.string().nullable().describe("Additional context about tracks, courses, or notable aspects of the program"),

  // Metadata
  confidence: z.enum(["high", "medium", "low"]).describe("How confident you are in this data"),
});

/**
 * POST /api/admin/llm/scrape-program
 * Use LLM to extract summer program information
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, organization, websiteUrl } = body as {
      id: string;
      name: string;
      organization: string;
      websiteUrl?: string;
    };

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();

    const prompt = `Extract information about the "${name}" summer program run by "${organization}" for ${currentYear}.

${websiteUrl ? `The program website is: ${websiteUrl}` : ""}

Please provide:

1. APPLICATION TIMELINE:
   - When do applications typically open?
   - What is the application deadline?
   - Is it rolling admissions?

2. ELIGIBILITY:
   - What grades/ages are eligible?
   - Are there specific requirements (citizenship, GPA, courses, etc.)?
   - Any complex eligibility rules (e.g., "must turn 16 by December 31")?

3. APPLICATION REQUIREMENTS:
   - What materials are needed? (recommendations, essays, transcripts, etc.)

4. PROGRAM DETAILS:
   - Is it residential, commuter, online, or hybrid?
   - Where is it located?
   - What are the program dates/sessions?

5. ADDITIONAL CONTEXT:
   - What tracks or courses are offered?
   - Any notable aspects about the program?

If you're not confident about specific information, use null and set confidence appropriately.
For dates, use YYYY-MM-DD format based on the ${currentYear} program year.`;

    const result = await generateObject({
      model: modelFor.fast, // Using Haiku for speed/cost
      schema: ProgramExtractionSchema,
      prompt,
    });

    return NextResponse.json({
      success: true,
      program: result.object,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[LLM Scrape Program] Error:", error);
    return NextResponse.json(
      { error: "Failed to scrape program info", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
