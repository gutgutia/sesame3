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
    aboutMe: true;
    academics: true;
    testing: true;
    activities: { orderBy: { displayOrder: "asc" } };
    awards: { orderBy: { displayOrder: "asc" } };
    courses: true;
    programs: true;
    goals: true;
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
  
  let basicInfo = `${name}`;
  if (grade) basicInfo += `, ${grade}`;
  if (school) basicInfo += ` at ${school}`;
  sections.push(basicInfo);
  
  // ==========================================================================
  // Academics
  // ==========================================================================
  if (profile.academics) {
    const { gpaUnweighted, gpaWeighted, classRank, classSize } = profile.academics;
    const gpaParts: string[] = [];
    
    if (gpaUnweighted) gpaParts.push(`${gpaUnweighted} unweighted`);
    if (gpaWeighted) gpaParts.push(`${gpaWeighted} weighted`);
    
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
    const { satTotal, satMath, satReading, actComposite, psatTotal } = profile.testing;
    const testParts: string[] = [];
    
    if (satTotal) {
      let satStr = `SAT: ${satTotal}`;
      if (satMath && satReading) satStr += ` (${satMath}M/${satReading}RW)`;
      testParts.push(satStr);
    }
    if (actComposite) testParts.push(`ACT: ${actComposite}`);
    if (psatTotal) testParts.push(`PSAT: ${psatTotal}`);
    
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
  // School List
  // ==========================================================================
  if (profile.schoolList && profile.schoolList.length > 0) {
    const byTier: Record<string, string[]> = {};
    
    for (const entry of profile.schoolList) {
      const tier = entry.tier || "exploring";
      if (!byTier[tier]) byTier[tier] = [];
      byTier[tier].push(entry.school.name);
    }
    
    const tierOrder = ["dream", "reach", "target", "safety", "exploring"];
    const schoolParts: string[] = [];
    
    for (const tier of tierOrder) {
      if (byTier[tier] && byTier[tier].length > 0) {
        schoolParts.push(`${tier}: ${byTier[tier].slice(0, 3).join(", ")}`);
      }
    }
    
    if (schoolParts.length > 0) {
      sections.push(`Schools: ${schoolParts.join("; ")}`);
    }
  }
  
  // ==========================================================================
  // Goals
  // ==========================================================================
  if (profile.goals && profile.goals.length > 0) {
    const activeGoals = profile.goals.filter(g => 
      g.status === "in_progress" || g.status === "planning"
    );
    
    if (activeGoals.length > 0) {
      const goalList = activeGoals.slice(0, 3).map(g => g.title).join("; ");
      sections.push(`Working on: ${goalList}`);
    }
  }
  
  // ==========================================================================
  // About Me (brief)
  // ==========================================================================
  // Note: Story is now stored in storyEntries, accessed separately
  
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
 */
function getProfileGaps(profile: FullProfile): string[] {
  const gaps: string[] = [];
  
  if (!profile.academics?.gpaUnweighted && !profile.academics?.gpaWeighted) {
    gaps.push("GPA");
  }
  if (!profile.testing?.satTotal && !profile.testing?.actComposite) {
    gaps.push("test scores");
  }
  if (!profile.activities || profile.activities.length === 0) {
    gaps.push("activities");
  }
  if (!profile.schoolList || profile.schoolList.length === 0) {
    gaps.push("school list");
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
