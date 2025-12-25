// =============================================================================
// SCHOOL BY ID API
// =============================================================================

/**
 * GET /api/schools/[id]
 * Get a single school by ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const school = await prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        shortName: true,
        city: true,
        state: true,
        country: true,
        type: true,
        acceptanceRate: true,
        edAcceptanceRate: true,
        eaAcceptanceRate: true,
        avgGpaUnweighted: true,
        avgGpaWeighted: true,
        satRange25: true,
        satRange75: true,
        actRange25: true,
        actRange75: true,
        undergradEnrollment: true,
        websiteUrl: true,
      },
    });
    
    if (!school) {
      return NextResponse.json(
        { error: "School not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(school);
  } catch (error) {
    console.error("Error fetching school:", error);
    return NextResponse.json(
      { error: "Failed to fetch school" },
      { status: 500 }
    );
  }
}

