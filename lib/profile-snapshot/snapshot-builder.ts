// =============================================================================
// PROFILE SNAPSHOT BUILDER
// =============================================================================

/**
 * Builds a ProfileSnapshot from the database profile.
 * The snapshot is a structured view used for calculations and assessments.
 */

import { prisma } from "@/lib/db";
import {
  ProfileSnapshot,
  AcademicsSnapshot,
  TestingSnapshot,
  ActivityItem,
  AwardItem,
  ProgramItem,
  CourseItem,
  GoalItem,
  SchoolListItem,
  BuildSnapshotOptions,
  ItemStatus,
} from "./types";

// =============================================================================
// MAIN BUILDER
// =============================================================================

/**
 * Builds a complete ProfileSnapshot for a student.
 */
export async function buildProfileSnapshot(
  profileId: string,
  options: BuildSnapshotOptions = {}
): Promise<ProfileSnapshot | null> {
  const {
    includeGoals = true,
    includeSchools = true,
  } = options;

  // Load profile with all relations
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    include: {
      academics: true,
      testing: {
        include: {
          satScores: true,
          actScores: true,
          apScores: true,
        },
      },
      activities: {
        orderBy: { displayOrder: "asc" },
      },
      awards: {
        orderBy: { displayOrder: "asc" },
      },
      programs: {
        orderBy: { year: "desc" },
      },
      courses: {
        orderBy: { academicYear: "desc" },
      },
      goals: includeGoals ? {
        include: { tasks: true },
        orderBy: { displayOrder: "asc" },
      } : false,
      schoolList: includeSchools ? {
        include: { school: true },
        orderBy: { displayOrder: "asc" },
      } : false,
    },
  });

  if (!profile) {
    return null;
  }

  // Build academics snapshot
  const academics = buildAcademicsSnapshot(profile.academics);

  // Build testing snapshot
  const testing = buildTestingSnapshot(profile.testing);

  // Build activities
  const activities = buildActivities(profile.activities);

  // Build awards
  const awards = buildAwards(profile.awards);

  // Build programs
  const programs = buildPrograms(profile.programs);

  // Build courses
  const courses = buildCourses(profile.courses);

  // Build goals
  const goals = includeGoals && profile.goals 
    ? buildGoals(profile.goals as unknown as GoalWithTasks[])
    : [];

  // Build school list
  const schools = includeSchools && profile.schoolList
    ? buildSchoolList(profile.schoolList as unknown as StudentSchoolWithSchool[])
    : [];

  // Calculate summary counts
  const counts = {
    activities: activities.length,
    leadershipPositions: activities.filter(a => a.isLeadership).length,
    spikeActivities: activities.filter(a => a.isSpike).length,
    awards: awards.length,
    nationalAwards: awards.filter(a => a.level === "national" || a.level === "international").length,
    programs: programs.length,
    selectivePrograms: programs.filter(p => p.selectivity === "highly_selective" || p.selectivity === "selective").length,
    apCourses: courses.filter(c => c.level === "ap" || c.level === "ib").length,
    goalsInProgress: goals.filter(g => g.status === "in_progress").length,
    goalsPlanning: goals.filter(g => g.status === "planning").length,
  };

  return {
    id: profile.id,
    firstName: profile.firstName,
    preferredName: profile.preferredName,
    grade: profile.grade,
    graduationYear: profile.graduationYear,
    highSchool: {
      name: profile.highSchoolName,
      city: profile.highSchoolCity,
      state: profile.highSchoolState,
      type: profile.highSchoolType,
    },
    academics,
    testing,
    activities,
    awards,
    programs,
    courses,
    goals,
    schools,
    counts,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

// =============================================================================
// HELPER BUILDERS
// =============================================================================

interface AcademicsModel {
  schoolReportedGpaUnweighted: number | null;
  schoolReportedGpaWeighted: number | null;
  gpaScale: number | null;
  classRank: number | null;
  classSize: number | null;
}

function buildAcademicsSnapshot(academics: AcademicsModel | null): AcademicsSnapshot {
  if (!academics) {
    return {
      gpaUnweighted: null,
      gpaWeighted: null,
      gpaScale: null,
      classRank: null,
      classSize: null,
      percentile: null,
    };
  }

  // Calculate percentile from class rank
  let percentile: number | null = null;
  if (academics.classRank && academics.classSize) {
    percentile = Math.round((1 - academics.classRank / academics.classSize) * 100);
  }

  return {
    gpaUnweighted: academics.schoolReportedGpaUnweighted,
    gpaWeighted: academics.schoolReportedGpaWeighted,
    gpaScale: academics.gpaScale,
    classRank: academics.classRank,
    classSize: academics.classSize,
    percentile,
  };
}

interface TestingModel {
  psatTotal: number | null;
  satScores: Array<{
    total: number;
    math: number;
    reading: number;
    isPrimary: boolean;
  }>;
  actScores: Array<{
    composite: number;
    english: number;
    math: number;
    reading: number;
    science: number;
    isPrimary: boolean;
  }>;
  apScores: Array<{
    subject: string;
    score: number;
  }>;
}

function buildTestingSnapshot(testing: TestingModel | null): TestingSnapshot {
  if (!testing) {
    return {
      sat: null,
      act: null,
      psat: null,
      apScores: [],
    };
  }

  // Get best/primary SAT
  let sat: TestingSnapshot["sat"] = null;
  if (testing.satScores && testing.satScores.length > 0) {
    const primarySat = testing.satScores.find(s => s.isPrimary)
      || testing.satScores.reduce((best, curr) => curr.total > best.total ? curr : best);
    sat = {
      total: primarySat.total,
      math: primarySat.math,
      reading: primarySat.reading,
    };
  }

  // Get best/primary ACT
  let act: TestingSnapshot["act"] = null;
  if (testing.actScores && testing.actScores.length > 0) {
    const primaryAct = testing.actScores.find(s => s.isPrimary)
      || testing.actScores.reduce((best, curr) => curr.composite > best.composite ? curr : best);
    act = {
      composite: primaryAct.composite,
      english: primaryAct.english,
      math: primaryAct.math,
      reading: primaryAct.reading,
      science: primaryAct.science,
    };
  }

  return {
    sat,
    act,
    psat: testing.psatTotal,
    apScores: testing.apScores.map(ap => ({
      subject: ap.subject,
      score: ap.score,
    })),
  };
}

interface ActivityModel {
  id: string;
  title: string;
  organization: string;
  category: string | null;
  isLeadership: boolean;
  isSpike: boolean;
  yearsActive: string | null;
  hoursPerWeek: number | null;
  description: string | null;
  isContinuing: boolean;
}

function buildActivities(activities: ActivityModel[]): ActivityItem[] {
  return activities.map(a => ({
    id: a.id,
    title: a.title,
    organization: a.organization,
    category: a.category,
    isLeadership: a.isLeadership,
    isSpike: a.isSpike,
    yearsActive: a.yearsActive,
    hoursPerWeek: a.hoursPerWeek,
    description: a.description,
    status: "actual" as ItemStatus, // Activities are always actual
  }));
}

interface AwardModel {
  id: string;
  title: string;
  organization: string | null;
  level: string;
  category: string | null;
  year: number | null;
}

function buildAwards(awards: AwardModel[]): AwardItem[] {
  return awards.map(a => ({
    id: a.id,
    title: a.title,
    organization: a.organization,
    level: a.level,
    category: a.category,
    year: a.year,
    status: "actual" as ItemStatus, // Awards are always actual
  }));
}

interface ProgramModel {
  id: string;
  name: string;
  organization: string | null;
  type: string;
  selectivity: string | null;
  year: number | null;
  status: string;
}

function buildPrograms(programs: ProgramModel[]): ProgramItem[] {
  return programs.map(p => {
    // Map program status to ItemStatus
    let status: ItemStatus = "actual";
    if (p.status === "interested" || p.status === "applying" || p.status === "applied") {
      status = "in_progress";
    } else if (p.status === "attending" || p.status === "completed") {
      status = "actual";
    }

    return {
      id: p.id,
      name: p.name,
      organization: p.organization,
      type: p.type,
      selectivity: p.selectivity,
      year: p.year,
      status,
    };
  });
}

interface CourseModel {
  id: string;
  name: string;
  subject: string | null;
  level: string | null;
  grade: string | null;
  status: string;
}

function buildCourses(courses: CourseModel[]): CourseItem[] {
  return courses.map(c => {
    // Map course status to ItemStatus
    let status: ItemStatus = "actual";
    if (c.status === "completed") {
      status = "actual";
    } else if (c.status === "in_progress") {
      status = "in_progress";
    } else if (c.status === "planned") {
      status = "planning";
    }

    return {
      id: c.id,
      name: c.name,
      subject: c.subject,
      level: c.level,
      grade: c.grade,
      status,
    };
  });
}

interface TaskModel {
  status: string;
}

interface GoalWithTasks {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string | null;
  targetDate: Date | null;
  impactDescription: string | null;
  tasks: TaskModel[];
}

function buildGoals(goals: GoalWithTasks[]): GoalItem[] {
  return goals.map(g => ({
    id: g.id,
    title: g.title,
    description: g.description,
    category: g.category,
    status: g.status as GoalItem["status"],
    priority: g.priority,
    targetDate: g.targetDate,
    impactDescription: g.impactDescription,
    tasksTotal: g.tasks.length,
    tasksCompleted: g.tasks.filter(t => t.status === "completed").length,
  }));
}

interface SchoolModel {
  acceptanceRate: number | null;
  satRange25: number | null;
  satRange75: number | null;
  actRange25: number | null;
  actRange75: number | null;
  avgGpaUnweighted: number | null;
  name: string;
}

interface StudentSchoolWithSchool {
  id: string;
  schoolId: string;
  tier: string;
  isDream: boolean;
  interestLevel: string | null;
  status: string;
  applicationType: string | null;
  school: SchoolModel;
}

function buildSchoolList(schoolList: StudentSchoolWithSchool[]): SchoolListItem[] {
  return schoolList.map(s => ({
    id: s.id,
    schoolId: s.schoolId,
    schoolName: s.school.name,
    tier: s.tier,
    isDream: s.isDream,
    interestLevel: s.interestLevel,
    applicationStatus: s.status,
    applicationType: s.applicationType,
    school: {
      acceptanceRate: s.school.acceptanceRate,
      satRange25: s.school.satRange25,
      satRange75: s.school.satRange75,
      actRange25: s.school.actRange25,
      actRange75: s.school.actRange75,
      avgGpaUnweighted: s.school.avgGpaUnweighted,
    },
  }));
}

