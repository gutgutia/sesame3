// =============================================================================
// CHANCES API ENDPOINT
// =============================================================================

/**
 * POST /api/chances
 * Calculate admission chances for a student at a specific school.
 * 
 * Uses "trajectory" mode by default - includes actual achievements AND
 * in-progress goals to give a realistic assessment of where the student
 * is headed.
 * 
 * Body:
 * {
 *   schoolId: string,
 *   useLLM?: boolean,        // Default: true
 *   useQuantitative?: boolean // Default: true
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { requireProfile } from "@/lib/auth";
import { calculateChances } from "@/lib/chances";

export const maxDuration = 60; // Allow up to 60 seconds for LLM processing

export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();
    
    const { schoolId, useLLM = true, useQuantitative = true } = body;
    
    if (!schoolId) {
      return NextResponse.json(
        { error: "schoolId is required" },
        { status: 400 }
      );
    }
    
    // Calculate chances (always uses trajectory mode internally)
    const result = await calculateChances(profileId, schoolId, {
      useLLM,
      useQuantitative,
    });
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("Chances calculation error:", error);
    
    if (error instanceof Error) {
      if (error.message === "Profile not found") {
        return NextResponse.json(
          { error: "Not authenticated" },
          { status: 401 }
        );
      }
      if (error.message === "School not found") {
        return NextResponse.json(
          { error: "School not found" },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to calculate chances" },
      { status: 500 }
    );
  }
}
