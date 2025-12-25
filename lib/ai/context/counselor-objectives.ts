// =============================================================================
// COUNSELOR OBJECTIVES (STUB)
// =============================================================================

/**
 * Generates the counselor's objectives for this conversation.
 * This is a STUB - full implementation will come later with background jobs.
 * 
 * Future implementation will:
 * - Load pre-generated objectives from DB
 * - Consider profile gaps, deadlines, time since last session
 * - Be updated by daily cron job and after each session
 * 
 * Token budget: ~100 tokens
 */

import { Prisma } from "@prisma/client";

type ProfileForObjectives = Prisma.StudentProfileGetPayload<{
  include: {
    academics: true;
    testing: true;
    activities: true;
    awards: true;
    schoolList: true;
    goals: true;
  };
}>;

export async function buildCounselorObjectives(
  profileId: string,
  profile?: ProfileForObjectives | null
): Promise<string> {
  // STUB: Generate basic objectives based on profile state
  // TODO: Replace with pre-generated objectives from DB
  
  if (!profile) {
    return `Objectives for this conversation:
1. Welcome the student and learn their name
2. Understand what grade they're in
3. Find out what brings them here today
4. Start building rapport`;
  }
  
  const objectives: string[] = [];
  
  // Check profile gaps and create objectives
  if (!profile.academics?.schoolReportedGpaUnweighted && !profile.academics?.schoolReportedGpaWeighted) {
    objectives.push("Try to learn their GPA if it comes up naturally");
  }
  
  // Note: Testing model uses satScores[] and actScores[] arrays now
  // But we only have basic testing relation here, so check if testing exists
  if (!profile.testing) {
    objectives.push("Find out if they've taken standardized tests");
  }
  
  if (!profile.activities || profile.activities.length === 0) {
    objectives.push("Learn about their extracurricular activities");
  }
  
  if (!profile.schoolList || profile.schoolList.length === 0) {
    objectives.push("Discover what schools they're interested in");
  }
  
  if (profile.goals && profile.goals.length > 0) {
    const inProgress = profile.goals.filter(g => g.status === "in_progress");
    if (inProgress.length > 0) {
      objectives.push(`Check on progress: "${inProgress[0].title}"`);
    }
  }
  
  // Default objectives if profile is complete
  if (objectives.length === 0) {
    objectives.push("Help with whatever the student needs today");
    objectives.push("Look for opportunities to deepen their profile");
    objectives.push("Consider if their school list is balanced");
  }
  
  return `Objectives for this conversation:
${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

Remember: These are background objectives. Focus primarily on what the student wants to discuss.`;
}

/**
 * Regenerates objectives for a student.
 * Called after session ends, on profile update, or by daily cron.
 * 
 * STUB - to be implemented
 */
export async function regenerateObjectives(profileId: string): Promise<void> {
  // STUB: Will implement with:
  // 1. Load full profile
  // 2. Check for upcoming deadlines
  // 3. Analyze gaps and opportunities
  // 4. Use AI to generate thoughtful objectives
  // 5. Store in DB for next session
  
  console.log(`[STUB] Would regenerate objectives for profile ${profileId}`);
}
