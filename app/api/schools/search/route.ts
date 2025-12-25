import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/schools/search?q=harvard
 * Search schools in the global database
 * 
 * Query params:
 *   - q: Search query (min 2 characters)
 *   - limit: Max results (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

    if (query.length < 2) {
      return NextResponse.json({ schools: [], message: "Query too short" });
    }

    // Search by name or shortName
    const schools = await prisma.school.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { shortName: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        shortName: true,
        city: true,
        state: true,
        type: true,
        acceptanceRate: true,
        satRange25: true,
        satRange75: true,
        websiteUrl: true,
      },
      orderBy: [
        // Prioritize exact matches and shorter names (more relevant)
        { name: "asc" },
      ],
      take: limit,
    });

    return NextResponse.json({ schools });
  } catch (error) {
    console.error("Error searching schools:", error);
    return NextResponse.json(
      { error: "Failed to search schools" },
      { status: 500 }
    );
  }
}

