/**
 * School Seed Data - Top 50 US Universities
 *
 * Data sources:
 * - Basic info: College Scorecard API
 * - Additional context: Manual research for LLM notes
 *
 * Usage:
 *   npm run db:seed-schools
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Admissions cycle for deadline data (Fall 2026 enrollment = applying 2025-2026)
const ADMISSIONS_CYCLE = 2026;

interface SchoolSeed {
  name: string;
  city: string;
  state: string;
  country?: string;
  type: "private" | "public" | "liberal_arts";

  // Admission types
  hasEarlyDecision: boolean;
  hasEarlyDecisionII: boolean;
  hasEarlyAction: boolean;
  isRestrictiveEarlyAction: boolean;
  hasRollingAdmissions: boolean;
  admissionsNotes?: string;

  // Stats (from College Scorecard or latest available)
  acceptanceRate?: number; // 0.0 - 1.0
  satRange25?: number;
  satRange75?: number;
  actRange25?: number;
  actRange75?: number;
  undergradEnrollment?: number;

  // Costs
  tuition?: number;
  roomBoard?: number;
  avgFinancialAid?: number;

  // Links
  websiteUrl: string;

  // LLM Context (rich notes for advisor)
  notes?: string;

  // Metadata
  dataSource: string;
  dataStatus: string;

  // Deadlines for current cycle
  deadlines?: {
    deadlineEd?: Date;
    deadlineEd2?: Date;
    deadlineEa?: Date;
    deadlineRd?: Date;
    deadlinePriority?: Date;
    deadlineFinancialAid?: Date;
  };
}

// =============================================================================
// TOP 50 US UNIVERSITIES - Seed Data
// =============================================================================
// Note: Stats are approximate and should be verified. Deadlines are for 2025-2026 cycle.
// Data will be enriched via College Scorecard API and manual research.
// =============================================================================

const schools2026: SchoolSeed[] = [
  // =============================================================================
  // IVY LEAGUE (8 schools)
  // =============================================================================
  {
    name: "Harvard University",
    city: "Cambridge",
    state: "MA",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: true, // SCEA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.harvard.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Yale University",
    city: "New Haven",
    state: "CT",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: true, // SCEA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.yale.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Princeton University",
    city: "Princeton",
    state: "NJ",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: true, // SCEA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.princeton.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Columbia University",
    city: "New York",
    state: "NY",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.columbia.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Pennsylvania",
    city: "Philadelphia",
    state: "PA",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.upenn.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Brown University",
    city: "Providence",
    state: "RI",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.brown.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Dartmouth College",
    city: "Hanover",
    state: "NH",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://home.dartmouth.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Cornell University",
    city: "Ithaca",
    state: "NY",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.cornell.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },

  // =============================================================================
  // TOP PRIVATE UNIVERSITIES (Non-Ivy)
  // =============================================================================
  {
    name: "Stanford University",
    city: "Stanford",
    state: "CA",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: true, // REA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.stanford.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Massachusetts Institute of Technology",
    city: "Cambridge",
    state: "MA",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false, // Non-restrictive EA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.mit.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "California Institute of Technology",
    city: "Pasadena",
    state: "CA",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: true, // REA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.caltech.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Duke University",
    city: "Durham",
    state: "NC",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.duke.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Northwestern University",
    city: "Evanston",
    state: "IL",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.northwestern.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Chicago",
    city: "Chicago",
    state: "IL",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "Offers ED1, ED2, and EA. Known for quirky supplemental essays.",
    websiteUrl: "https://www.uchicago.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Johns Hopkins University",
    city: "Baltimore",
    state: "MD",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.jhu.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Rice University",
    city: "Houston",
    state: "TX",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.rice.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Vanderbilt University",
    city: "Nashville",
    state: "TN",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.vanderbilt.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Notre Dame",
    city: "Notre Dame",
    state: "IN",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: true, // REA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.nd.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Washington University in St. Louis",
    city: "St. Louis",
    state: "MO",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://wustl.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Georgetown University",
    city: "Washington",
    state: "DC",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: true, // REA
    hasRollingAdmissions: false,
    websiteUrl: "https://www.georgetown.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Emory University",
    city: "Atlanta",
    state: "GA",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.emory.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Carnegie Mellon University",
    city: "Pittsburgh",
    state: "PA",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.cmu.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Southern California",
    city: "Los Angeles",
    state: "CA",
    type: "private",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "No early application options. Single deadline for all applicants.",
    websiteUrl: "https://www.usc.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "New York University",
    city: "New York",
    state: "NY",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.nyu.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Tufts University",
    city: "Medford",
    state: "MA",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.tufts.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Boston College",
    city: "Chestnut Hill",
    state: "MA",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.bc.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Boston University",
    city: "Boston",
    state: "MA",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.bu.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Case Western Reserve University",
    city: "Cleveland",
    state: "OH",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.case.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Northeastern University",
    city: "Boston",
    state: "MA",
    type: "private",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "Known for co-op program. Offers ED, ED2, and EA.",
    websiteUrl: "https://www.northeastern.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },

  // =============================================================================
  // TOP PUBLIC UNIVERSITIES
  // =============================================================================
  {
    name: "University of California, Berkeley",
    city: "Berkeley",
    state: "CA",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "UC system has single deadline (Nov 30). No early options.",
    websiteUrl: "https://www.berkeley.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of California, Los Angeles",
    city: "Los Angeles",
    state: "CA",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "UC system has single deadline (Nov 30). No early options.",
    websiteUrl: "https://www.ucla.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Michigan",
    city: "Ann Arbor",
    state: "MI",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://umich.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Virginia",
    city: "Charlottesville",
    state: "VA",
    type: "public",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "ED is binding. EA is available and non-restrictive.",
    websiteUrl: "https://www.virginia.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of North Carolina at Chapel Hill",
    city: "Chapel Hill",
    state: "NC",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.unc.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Georgia Institute of Technology",
    city: "Atlanta",
    state: "GA",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.gatech.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Texas at Austin",
    city: "Austin",
    state: "TX",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "Priority deadline for Texas residents. Auto-admission for top 6% in-state.",
    websiteUrl: "https://www.utexas.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Wisconsin-Madison",
    city: "Madison",
    state: "WI",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.wisc.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Illinois Urbana-Champaign",
    city: "Champaign",
    state: "IL",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://illinois.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Florida",
    city: "Gainesville",
    state: "FL",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.ufl.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Ohio State University",
    city: "Columbus",
    state: "OH",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.osu.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Penn State University",
    city: "University Park",
    state: "PA",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: true,
    admissionsNotes: "Rolling admissions. Apply early for best consideration.",
    websiteUrl: "https://www.psu.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Purdue University",
    city: "West Lafayette",
    state: "IN",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: true,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.purdue.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of Washington",
    city: "Seattle",
    state: "WA",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.washington.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "University of California, San Diego",
    city: "La Jolla",
    state: "CA",
    type: "public",
    hasEarlyDecision: false,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "UC system has single deadline (Nov 30). No early options.",
    websiteUrl: "https://ucsd.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },

  // =============================================================================
  // TOP LIBERAL ARTS COLLEGES
  // =============================================================================
  {
    name: "Williams College",
    city: "Williamstown",
    state: "MA",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.williams.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Amherst College",
    city: "Amherst",
    state: "MA",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: false,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.amherst.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Swarthmore College",
    city: "Swarthmore",
    state: "PA",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.swarthmore.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Pomona College",
    city: "Claremont",
    state: "CA",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "Part of the Claremont Colleges consortium.",
    websiteUrl: "https://www.pomona.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Wellesley College",
    city: "Wellesley",
    state: "MA",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "Women's college.",
    websiteUrl: "https://www.wellesley.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Bowdoin College",
    city: "Brunswick",
    state: "ME",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "Test-optional pioneer. No SAT/ACT required.",
    websiteUrl: "https://www.bowdoin.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Middlebury College",
    city: "Middlebury",
    state: "VT",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    websiteUrl: "https://www.middlebury.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
  {
    name: "Claremont McKenna College",
    city: "Claremont",
    state: "CA",
    type: "liberal_arts",
    hasEarlyDecision: true,
    hasEarlyDecisionII: true,
    hasEarlyAction: false,
    isRestrictiveEarlyAction: false,
    hasRollingAdmissions: false,
    admissionsNotes: "Part of the Claremont Colleges consortium. Strong in economics and government.",
    websiteUrl: "https://www.cmc.edu",
    dataSource: "manual",
    dataStatus: "pending_review",
  },
];

async function seedSchools() {
  console.log("Seeding schools...");

  for (const schoolData of schools2026) {
    const { deadlines, ...school } = schoolData;

    const existing = await prisma.school.findUnique({
      where: { name: school.name },
    });

    if (existing) {
      console.log(`  Updating: ${school.name}`);

      // Update the school
      await prisma.school.update({
        where: { id: existing.id },
        data: {
          ...school,
          lastUpdated: new Date(),
        },
      });

      // Update or create deadline year if provided
      if (deadlines) {
        await prisma.schoolDeadlineYear.upsert({
          where: {
            schoolId_admissionsCycle: {
              schoolId: existing.id,
              admissionsCycle: ADMISSIONS_CYCLE,
            },
          },
          update: {
            ...deadlines,
            dataSource: "manual",
          },
          create: {
            schoolId: existing.id,
            admissionsCycle: ADMISSIONS_CYCLE,
            ...deadlines,
            dataSource: "manual",
          },
        });
      }
    } else {
      console.log(`  Creating: ${school.name}`);

      // Create school with deadlines
      const newSchool = await prisma.school.create({
        data: school,
      });

      // Create deadline year if provided
      if (deadlines) {
        await prisma.schoolDeadlineYear.create({
          data: {
            schoolId: newSchool.id,
            admissionsCycle: ADMISSIONS_CYCLE,
            ...deadlines,
            dataSource: "manual",
          },
        });
      }
    }
  }

  console.log(`Seeded ${schools2026.length} schools`);
}

async function main() {
  try {
    await seedSchools();
    console.log("\nSchool seeding complete!");
  } catch (error) {
    console.error("Error seeding schools:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
