// =============================================================================
// PROFILE NARRATIVE GENERATOR
// =============================================================================

/**
 * Generates a human-readable narrative of the student's profile.
 * Used in the Advisor prompt to give Claude full context.
 * 
 * Token budget: ~300 tokens
 */

import { Prisma } from "@prisma/client";

// Type for the profile with all relations loaded
type FullProfile = Prisma.StudentProfileGetPayload<{
  include: {
    aboutMe: {
      include: {
        storyEntries: true;
      };
    };
    academics: true;
    testing: {
      include: {
        satScores: true;
        actScores: true;
        apScores: true;
        subjectTests: true;
      };
    };
    activities: { orderBy: { displayOrder: "asc" } };
    awards: { orderBy: { displayOrder: "asc" } };
    courses: true;
    programs: true;
    goals: { include: { tasks: true } };
    schoolList: { include: { school: true } };
  };
}>;

export function buildProfileNarrative(profile: FullProfile | null): string {
  if (!profile) {
    return "No profile data available yet. This appears to be a new student.";
  }
  
  const sections: string[] = [];
  
  // ==========================================================================
  // Basic Info
  // ==========================================================================
  const name = profile.preferredName || profile.firstName || "Student";
  const grade = profile.grade ? formatGrade(profile.grade) : null;
  const school = profile.highSchoolName || null;
  const schoolType = profile.highSchoolType || null;
  
  let basicInfo = `${name}`;
  if (grade) basicInfo += `, ${grade}`;
  if (school) {
    basicInfo += ` at ${school}`;
    if (schoolType) basicInfo += ` (${schoolType})`;
  }
  if (profile.highSchoolCity && profile.highSchoolState) {
    basicInfo += ` in ${profile.highSchoolCity}, ${profile.highSchoolState}`;
  }
  sections.push(basicInfo);
  
  // ==========================================================================
  // Academics
  // ==========================================================================
  if (profile.academics) {
    const { schoolReportedGpaUnweighted, schoolReportedGpaWeighted, classRank, classSize } = profile.academics;
    const gpaParts: string[] = [];
    
    if (schoolReportedGpaUnweighted) gpaParts.push(`${schoolReportedGpaUnweighted} unweighted`);
    if (schoolReportedGpaWeighted) gpaParts.push(`${schoolReportedGpaWeighted} weighted`);
    
    if (gpaParts.length > 0) {
      let gpaStr = `GPA: ${gpaParts.join(", ")}`;
      if (classRank && classSize) {
        gpaStr += ` (rank ${classRank}/${classSize})`;
      }
      sections.push(gpaStr);
    }
  }
  
  // ==========================================================================
  // Testing
  // ==========================================================================
  if (profile.testing) {
    const testParts: string[] = [];
    
    // SAT - get best/primary score from satScores array
    if (profile.testing.satScores && profile.testing.satScores.length > 0) {
      // Find primary score, or use highest total
      const primarySat = profile.testing.satScores.find(s => s.isPrimary) 
        || profile.testing.satScores.reduce((best, curr) => curr.total > best.total ? curr : best);
      
      let satStr = `SAT: ${primarySat.total}`;
      satStr += ` (${primarySat.math}M/${primarySat.reading}RW)`;
      testParts.push(satStr);
    }
    
    // ACT - get best/primary score from actScores array
    if (profile.testing.actScores && profile.testing.actScores.length > 0) {
      const primaryAct = profile.testing.actScores.find(s => s.isPrimary)
        || profile.testing.actScores.reduce((best, curr) => curr.composite > best.composite ? curr : best);
      
      testParts.push(`ACT: ${primaryAct.composite}`);
    }
    
    // PSAT (still directly on Testing)
    if (profile.testing.psatTotal) {
      testParts.push(`PSAT: ${profile.testing.psatTotal}`);
    }
    
    // AP Scores
    if (profile.testing.apScores && profile.testing.apScores.length > 0) {
      const highScores = profile.testing.apScores.filter(ap => ap.score >= 4);
      if (highScores.length > 0) {
        testParts.push(`${highScores.length} AP scores of 4+`);
      }
    }
    
    if (testParts.length > 0) {
      sections.push(testParts.join(", "));
    }
  }
  
  // ==========================================================================
  // Activities (top 5, leadership first)
  // ==========================================================================
  if (profile.activities && profile.activities.length > 0) {
    const sorted = [...profile.activities].sort((a, b) => 
      (b.isLeadership ? 1 : 0) - (a.isLeadership ? 1 : 0)
    );
    
    const activityList = sorted.slice(0, 5).map(a => {
      const role = a.title || "Member";
      const org = a.organization || "Activity";
      return a.isLeadership ? `${role} of ${org} (leadership)` : `${role}, ${org}`;
    });
    
    sections.push(`Activities: ${activityList.join("; ")}`);
  }
  
  // ==========================================================================
  // Awards (top 3)
  // ==========================================================================
  if (profile.awards && profile.awards.length > 0) {
    const awardList = profile.awards.slice(0, 3).map(a => {
      const level = a.level ? ` (${a.level})` : "";
      return `${a.title}${level}`;
    });
    
    sections.push(`Awards: ${awardList.join("; ")}`);
  }
  
  // ==========================================================================
  // Programs
  // ==========================================================================
  if (profile.programs && profile.programs.length > 0) {
    const programList = profile.programs.slice(0, 3).map(p => {
      const status = p.status ? ` - ${p.status}` : "";
      return `${p.name}${status}`;
    });
    
    sections.push(`Programs: ${programList.join("; ")}`);
  }
  
  // ==========================================================================
  // Current/Planned Courses
  // ==========================================================================
  if (profile.courses && profile.courses.length > 0) {
    const current = profile.courses.filter(c => c.status === "in_progress");
    const planned = profile.courses.filter(c => c.status === "planned");
    
    if (current.length > 0) {
      const courseList = current.slice(0, 5).map(c => c.name).join(", ");
      sections.push(`Currently taking: ${courseList}`);
    }
    
    if (planned.length > 0) {
      const courseList = planned.slice(0, 3).map(c => c.name).join(", ");
      sections.push(`Planning to take: ${courseList}`);
    }
  }
  
  // ==========================================================================
  // School List (with dream schools and application status)
  // ==========================================================================
  if (profile.schoolList && profile.schoolList.length > 0) {
    // Helper to get school name (handles custom schools)
    const getSchoolName = (entry: (typeof profile.schoolList)[number]): string => {
      return entry.school?.name || entry.customName || "Unknown School";
    };

    // Highlight dream schools first
    const dreamSchools = profile.schoolList.filter(s => s.isDream);
    if (dreamSchools.length > 0) {
      const dreamNames = dreamSchools.map(s => getSchoolName(s)).join(", ");
      sections.push(`Dream schools: ${dreamNames}`);
    }

    // Then by tier
    const byTier: Record<string, string[]> = {};
    for (const entry of profile.schoolList) {
      const tier = entry.tier || "exploring";
      if (!byTier[tier]) byTier[tier] = [];

      let schoolStr = getSchoolName(entry);
      // Add application status if actively applying
      if (entry.status && entry.status !== "researching") {
        schoolStr += ` (${entry.status})`;
      }
      byTier[tier].push(schoolStr);
    }
    
    const tierOrder = ["reach", "target", "safety", "exploring"];
    const schoolParts: string[] = [];
    
    for (const tier of tierOrder) {
      if (byTier[tier] && byTier[tier].length > 0) {
        schoolParts.push(`${tier}: ${byTier[tier].slice(0, 4).join(", ")}`);
      }
    }
    
    if (schoolParts.length > 0) {
      sections.push(`School list: ${schoolParts.join("; ")}`);
    }
  }
  
  // ==========================================================================
  // Goals - What They're Working On
  // ==========================================================================
  if (profile.goals && profile.goals.length > 0) {
    // In-progress goals (actively working on)
    const inProgress = profile.goals.filter(g => g.status === "in_progress");
    if (inProgress.length > 0) {
      const goalList = inProgress.slice(0, 4).map(g => {
        let goalStr = g.title;
        if (g.category) goalStr += ` (${g.category})`;
        // Show task progress if there are tasks
        if (g.tasks && g.tasks.length > 0) {
          const completed = g.tasks.filter(t => t.status === "completed").length;
          goalStr += ` - ${completed}/${g.tasks.length} tasks done`;
        }
        return goalStr;
      });
      sections.push(`Currently working on: ${goalList.join("; ")}`);
    }
    
    // Planning goals (upcoming)
    const planning = profile.goals.filter(g => g.status === "planning");
    if (planning.length > 0) {
      const goalList = planning.slice(0, 3).map(g => {
        let goalStr = g.title;
        if (g.targetDate) {
          goalStr += ` (target: ${new Date(g.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })})`;
        }
        return goalStr;
      });
      sections.push(`Planning to do: ${goalList.join("; ")}`);
    }
    
    // Recently completed goals (for context)
    const completed = profile.goals.filter(g => g.status === "completed");
    if (completed.length > 0) {
      const recentCompleted = completed.slice(0, 2).map(g => g.title);
      sections.push(`Recently completed: ${recentCompleted.join("; ")}`);
    }
  }
  
  // ==========================================================================
  // About Me - Personal Identity
  // ==========================================================================
  if (profile.aboutMe) {
    const aboutParts: string[] = [];
    
    // Values and interests
    if (profile.aboutMe.values && profile.aboutMe.values.length > 0) {
      aboutParts.push(`Values: ${profile.aboutMe.values.join(", ")}`);
    }
    if (profile.aboutMe.interests && profile.aboutMe.interests.length > 0) {
      aboutParts.push(`Interests: ${profile.aboutMe.interests.join(", ")}`);
    }
    if (profile.aboutMe.personality) {
      aboutParts.push(`Personality: ${profile.aboutMe.personality}`);
    }
    if (profile.aboutMe.aspirations) {
      aboutParts.push(`Aspirations: ${profile.aboutMe.aspirations}`);
    }
    if (profile.aboutMe.background) {
      aboutParts.push(`Background: ${profile.aboutMe.background}`);
    }
    
    if (aboutParts.length > 0) {
      sections.push(aboutParts.join("\n"));
    }
    
    // Story entries - personal narratives
    if (profile.aboutMe.storyEntries && profile.aboutMe.storyEntries.length > 0) {
      const recentStories = profile.aboutMe.storyEntries
        .slice(0, 3)
        .map(s => `"${s.title}" - ${s.summary}`);
      sections.push(`Personal stories:\n${recentStories.join("\n")}`);
    }
  }
  
  // ==========================================================================
  // Profile Gaps
  // ==========================================================================
  const gaps = getProfileGaps(profile);
  if (gaps.length > 0) {
    sections.push(`Missing: ${gaps.join(", ")}`);
  }
  
  return sections.join("\n");
}

/**
 * Identifies what's missing from the profile.
 * These are facts we'd like to know for a complete picture.
 */
function getProfileGaps(profile: FullProfile): string[] {
  const gaps: string[] = [];
  
  if (!profile.academics?.schoolReportedGpaUnweighted && !profile.academics?.schoolReportedGpaWeighted) {
    gaps.push("GPA");
  }
  
  const hasSat = profile.testing?.satScores && profile.testing.satScores.length > 0;
  const hasAct = profile.testing?.actScores && profile.testing.actScores.length > 0;
  if (!hasSat && !hasAct) {
    gaps.push("test scores");
  }
  
  if (!profile.activities || profile.activities.length === 0) {
    gaps.push("activities");
  }
  
  if (!profile.schoolList || profile.schoolList.length === 0) {
    gaps.push("school list");
  }
  
  // Personal identity gaps
  if (!profile.aboutMe || 
      (!profile.aboutMe.values?.length && !profile.aboutMe.interests?.length)) {
    gaps.push("personal story/interests");
  }
  
  return gaps;
}

/**
 * Formats grade level nicely.
 */
function formatGrade(grade: string): string {
  const gradeMap: Record<string, string> = {
    "9th": "freshman",
    "10th": "sophomore", 
    "11th": "junior",
    "12th": "senior",
    "gap_year": "gap year student",
  };
  
  return gradeMap[grade] || grade;
}
