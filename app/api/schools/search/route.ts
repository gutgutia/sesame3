import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Fuse from "fuse.js";

/**
 * Common school abbreviations/aliases for better fuzzy matching
 * These get added as searchable terms alongside the school name
 */
const SCHOOL_ALIASES: Record<string, string[]> = {
  "Massachusetts Institute of Technology": ["MIT"],
  "Carnegie Mellon University": ["CMU"],
  "University of California, Los Angeles": ["UCLA"],
  "University of California, Berkeley": ["UCB", "UC Berkeley", "Cal"],
  "University of Southern California": ["USC"],
  "New York University": ["NYU"],
  "University of Pennsylvania": ["UPenn", "Penn"],
  "University of North Carolina at Chapel Hill": ["UNC"],
  "University of Virginia": ["UVA"],
  "University of Michigan": ["UMich"],
  "Georgia Institute of Technology": ["Georgia Tech", "GaTech"],
  "California Institute of Technology": ["Caltech"],
  "Johns Hopkins University": ["JHU", "Hopkins"],
  "Boston University": ["BU"],
  "Boston College": ["BC"],
  "University of Maryland, College Park": ["UMD"],
  "Ohio State University": ["OSU"],
  "Pennsylvania State University": ["Penn State", "PSU"],
  "University of Texas at Austin": ["UT Austin", "UT"],
  "University of Washington": ["UW", "UDub"],
  "University of Wisconsin-Madison": ["UW Madison"],
  "University of California, San Diego": ["UCSD"],
  "University of California, Irvine": ["UCI"],
  "University of California, Santa Barbara": ["UCSB"],
  "University of California, Santa Cruz": ["UCSC"],
  "University of California, Davis": ["UC Davis", "UCD"],
  "University of California, Riverside": ["UCR"],
  "Washington University in St. Louis": ["WashU", "WUSTL"],
  "University of Notre Dame": ["Notre Dame"],
  "University of Illinois Urbana-Champaign": ["UIUC"],
  "George Mason University": ["GMU"],
  "George Washington University": ["GWU", "GW"],
  "Northeastern University": ["NEU"],
  "Florida State University": ["FSU"],
  "University of Florida": ["UF"],
  "University of South Florida": ["USF"],
  "Arizona State University": ["ASU"],
  "University of Arizona": ["UA", "UArizona"],
  "University of Texas at Dallas": ["UTD"],
  "Texas A&M University": ["TAMU", "Texas A&M"],
  "North Carolina State University": ["NC State", "NCSU"],
  "Virginia Tech": ["VT", "Virginia Polytechnic"],
  "Rochester Institute of Technology": ["RIT"],
  "Rensselaer Polytechnic Institute": ["RPI"],
  "University of Chicago": ["UChicago"],
  "Harvey Mudd College": ["HMC", "Mudd"],
  "University of Illinois at Chicago": ["UIC"],
  "University of Colorado Boulder": ["CU Boulder"],
};

// Cache for schools list and fuse index
let schoolsCache: SchoolWithAliases[] | null = null;
let fuseIndex: Fuse<SchoolWithAliases> | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type SchoolWithAliases = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  type: string | null;
  acceptanceRate: number | null;
  satRange25: number | null;
  satRange75: number | null;
  websiteUrl: string | null;
  searchText: string; // Combined name + aliases for fuzzy search
};

async function getSchoolsWithFuse(): Promise<Fuse<SchoolWithAliases>> {
  const now = Date.now();

  // Return cached index if still valid
  if (fuseIndex && schoolsCache && now - cacheTime < CACHE_TTL) {
    return fuseIndex;
  }

  // Fetch all schools from database
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      type: true,
      acceptanceRate: true,
      satRange25: true,
      satRange75: true,
      websiteUrl: true,
    },
  });

  // Add aliases as searchable text
  schoolsCache = schools.map((school) => {
    const aliases = SCHOOL_ALIASES[school.name] || [];
    return {
      ...school,
      searchText: [school.name, ...aliases, school.city, school.state]
        .filter(Boolean)
        .join(" "),
    };
  });

  // Create fuse index with fuzzy search options
  fuseIndex = new Fuse(schoolsCache, {
    keys: [
      { name: "searchText", weight: 2 },
      { name: "name", weight: 1.5 },
      { name: "city", weight: 0.5 },
      { name: "state", weight: 0.3 },
    ],
    threshold: 0.4, // 0 = exact match, 1 = match anything
    distance: 100, // How far to search for a match
    includeScore: true,
    ignoreLocation: true, // Search entire string, not just beginning
    minMatchCharLength: 2,
  });

  cacheTime = now;
  return fuseIndex;
}

/**
 * GET /api/schools/search?q=mit
 * Fuzzy search schools in the global database
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

    const fuse = await getSchoolsWithFuse();
    const results = fuse.search(query, { limit });

    // Map results back to school objects (without the searchText field)
    const schools = results.map(({ item }) => ({
      id: item.id,
      name: item.name,
      city: item.city,
      state: item.state,
      type: item.type,
      acceptanceRate: item.acceptanceRate,
      satRange25: item.satRange25,
      satRange75: item.satRange75,
      websiteUrl: item.websiteUrl,
    }));

    return NextResponse.json({ schools });
  } catch (error) {
    console.error("Error searching schools:", error);
    return NextResponse.json(
      { error: "Failed to search schools" },
      { status: 500 }
    );
  }
}
