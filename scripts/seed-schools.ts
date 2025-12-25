/**
 * Seed Schools from College Scorecard API
 * 
 * This script fetches school data from the US Department of Education's
 * College Scorecard API and seeds our database.
 * 
 * Usage:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/seed-schools.ts
 * 
 * Environment Variables Required:
 *   - COLLEGE_SCORECARD_API_KEY: Get from https://api.data.gov/signup/
 *   - DATABASE_URL: Prisma database connection
 * 
 * For logos, we use Logo.dev (no seeding needed, used at runtime):
 *   - NEXT_PUBLIC_LOGO_DEV_TOKEN: Get from https://logo.dev/dashboard/api-keys
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// College Scorecard API base URL
const SCORECARD_BASE_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

// Fields we want from the API
const SCORECARD_FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.school_url",
  "school.ownership", // 1=Public, 2=Private nonprofit, 3=Private for-profit
  "school.carnegie_basic",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
  "latest.student.size",
  "latest.cost.tuition.in_state",
  "latest.cost.tuition.out_of_state",
].join(",");

// Top 10 schools to seed for testing
// Names must match College Scorecard exactly
const TEST_SCHOOLS = [
  "Harvard University",
  "Stanford University",
  "Massachusetts Institute of Technology",
  "Yale University",
  "Princeton University",
  "Columbia University in the City of New York",
  "University of Pennsylvania",  // Exact match needed
  "Duke University",
  "Northwestern University",     // Exact match needed
  "University of California-Berkeley",
];

// School IDs from College Scorecard for reliable lookups
// Use IDs when name matching is unreliable
const SCHOOL_IDS: Record<string, number> = {
  "Harvard University": 166027,
  "Stanford University": 243744,
  "Massachusetts Institute of Technology": 166683,
  "Yale University": 130794,
  "Princeton University": 186131,
  "Columbia University in the City of New York": 190150,
  "University of Pennsylvania": 215062,
  "Duke University": 198419,
  "Northwestern University": 147767,
  "University of California-Berkeley": 110635,
};

interface ScorecardSchool {
  id: number;
  "school.name": string;
  "school.city": string;
  "school.state": string;
  "school.school_url": string | null;
  "school.ownership": number;
  "school.carnegie_basic": number | null;
  "latest.admissions.admission_rate.overall": number | null;
  "latest.admissions.sat_scores.25th_percentile.critical_reading": number | null;
  "latest.admissions.sat_scores.75th_percentile.critical_reading": number | null;
  "latest.admissions.sat_scores.25th_percentile.math": number | null;
  "latest.admissions.sat_scores.75th_percentile.math": number | null;
  "latest.admissions.act_scores.25th_percentile.cumulative": number | null;
  "latest.admissions.act_scores.75th_percentile.cumulative": number | null;
  "latest.student.size": number | null;
  "latest.cost.tuition.in_state": number | null;
  "latest.cost.tuition.out_of_state": number | null;
}

function getSchoolType(ownership: number): string {
  switch (ownership) {
    case 1: return "public";
    case 2: return "private";
    case 3: return "private_for_profit";
    default: return "unknown";
  }
}

function getShortName(name: string): string | null {
  // Common abbreviations
  const abbreviations: Record<string, string> = {
    "Harvard University": "Harvard",
    "Stanford University": "Stanford",
    "Massachusetts Institute of Technology": "MIT",
    "Yale University": "Yale",
    "Princeton University": "Princeton",
    "Columbia University in the City of New York": "Columbia",
    "University of Pennsylvania": "Penn",
    "Duke University": "Duke",
    "Northwestern University": "Northwestern",
    "University of California-Berkeley": "UC Berkeley",
    "University of California-Los Angeles": "UCLA",
    "University of Michigan-Ann Arbor": "Michigan",
    "University of Southern California": "USC",
    "New York University": "NYU",
    "Carnegie Mellon University": "CMU",
    "Georgia Institute of Technology-Main Campus": "Georgia Tech",
    "University of Texas at Austin": "UT Austin",
    "University of Virginia-Main Campus": "UVA",
  };
  return abbreviations[name] || null;
}

function cleanUrl(url: string | null): string | null {
  if (!url) return null;
  // Ensure URL has protocol
  if (!url.startsWith("http")) {
    return `https://${url}`;
  }
  return url;
}

async function fetchSchoolById(id: number, apiKey: string): Promise<ScorecardSchool | null> {
  const url = new URL(SCORECARD_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("id", id.toString());
  url.searchParams.set("fields", SCORECARD_FIELDS);

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`Failed to fetch school ID ${id}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0] as ScorecardSchool;
    }
    
    console.warn(`No results found for ID: ${id}`);
    return null;
  } catch (error) {
    console.error(`Error fetching school ID ${id}:`, error);
    return null;
  }
}

async function fetchSchoolByName(name: string, apiKey: string): Promise<ScorecardSchool | null> {
  // Try by ID first if we have it
  const id = SCHOOL_IDS[name];
  if (id) {
    return fetchSchoolById(id, apiKey);
  }

  // Fallback to name search
  const url = new URL(SCORECARD_BASE_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("school.name", name);
  url.searchParams.set("fields", SCORECARD_FIELDS);
  url.searchParams.set("per_page", "1");

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      console.error(`Failed to fetch ${name}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0] as ScorecardSchool;
    }
    
    console.warn(`No results found for: ${name}`);
    return null;
  } catch (error) {
    console.error(`Error fetching ${name}:`, error);
    return null;
  }
}

async function seedSchools() {
  // Support both naming conventions
  const apiKey = process.env.COLLEGE_SCORECARD_API_KEY || process.env.COLLEGE_SCORE_API_KEY;
  
  if (!apiKey) {
    console.error("❌ COLLEGE_SCORECARD_API_KEY not set in environment");
    console.log("\nTo get an API key:");
    console.log("1. Go to https://api.data.gov/signup/");
    console.log("2. Sign up for a free account");
    console.log("3. Add COLLEGE_SCORECARD_API_KEY=your_key to .env");
    process.exit(1);
  }

  console.log("🎓 Seeding schools from College Scorecard API...\n");

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const schoolName of TEST_SCHOOLS) {
    console.log(`Fetching: ${schoolName}...`);
    
    const data = await fetchSchoolByName(schoolName, apiKey);
    
    if (!data) {
      errorCount++;
      continue;
    }

    // Calculate combined SAT scores (reading + math)
    const sat25Reading = data["latest.admissions.sat_scores.25th_percentile.critical_reading"];
    const sat25Math = data["latest.admissions.sat_scores.25th_percentile.math"];
    const sat75Reading = data["latest.admissions.sat_scores.75th_percentile.critical_reading"];
    const sat75Math = data["latest.admissions.sat_scores.75th_percentile.math"];
    
    const satRange25 = (sat25Reading && sat25Math) ? sat25Reading + sat25Math : null;
    const satRange75 = (sat75Reading && sat75Math) ? sat75Reading + sat75Math : null;

    const schoolData = {
      name: data["school.name"],
      shortName: getShortName(data["school.name"]),
      city: data["school.city"],
      state: data["school.state"],
      country: "USA",
      type: getSchoolType(data["school.ownership"]),
      acceptanceRate: data["latest.admissions.admission_rate.overall"],
      satRange25,
      satRange75,
      actRange25: data["latest.admissions.act_scores.25th_percentile.cumulative"],
      actRange75: data["latest.admissions.act_scores.75th_percentile.cumulative"],
      undergradEnrollment: data["latest.student.size"],
      tuition: data["latest.cost.tuition.out_of_state"], // Use out-of-state as default
      websiteUrl: cleanUrl(data["school.school_url"]),
      dataSource: "college_scorecard",
      lastUpdated: new Date(),
    };

    try {
      // Upsert to handle re-runs
      await prisma.school.upsert({
        where: { name: schoolData.name },
        update: schoolData,
        create: schoolData,
      });
      
      console.log(`  ✅ ${schoolData.shortName || schoolData.name}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed to save ${schoolData.name}:`, error);
      errorCount++;
    }

    // Small delay to be nice to the API
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Successfully seeded: ${successCount} schools`);
  console.log(`⏭️  Skipped (already exists): ${skipCount} schools`);
  console.log(`❌ Errors: ${errorCount} schools`);
  console.log("=".repeat(50));
}

// Run the seed
seedSchools()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

