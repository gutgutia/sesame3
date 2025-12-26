// =============================================================================
// COUNSELOR OBJECTIVES
// =============================================================================

/**
 * Provides the counselor's objectives for this conversation.
 *
 * Uses AI-generated objectives from StudentContext when available.
 * Falls back to rule-based generation if no pre-generated objectives exist.
 *
 * Token budget: ~200 tokens
 */

import { prisma } from "@/lib/db";

// Profile type for objectives - using any for flexibility with Prisma types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProfileForObjectives = any;

type UpcomingDeadline = {
  type: string;
  label: string;
  date: string;
  daysUntil: number;
  priority: "urgent" | "soon" | "upcoming";
};

export async function buildCounselorObjectives(
  profileId: string,
  profile?: ProfileForObjectives | null
): Promise<string> {
  // Load StudentContext with pre-generated objectives and deadlines
  const context = await prisma.studentContext.findUnique({
    where: { studentProfileId: profileId },
    select: {
      generatedObjectives: true,
      objectivesGeneratedAt: true,
      upcomingDeadlines: true,
      openCommitments: true,
      accountabilityLevel: true,
      lastConversationAt: true,
      totalConversations: true,
    },
  });

  // Build the objectives section
  const sections: string[] = [];

  // Section 1: AI-generated objectives (primary)
  if (context?.generatedObjectives) {
    sections.push(`## Session Objectives\n${context.generatedObjectives}`);
  } else if (!profile) {
    // New student - use first-time objectives
    sections.push(buildFirstTimeObjectives());
  } else {
    // No pre-generated objectives - fall back to rule-based
    sections.push(buildFallbackObjectives(profile, context));
  }

  // Section 2: Deadline awareness
  const deadlines = context?.upcomingDeadlines as UpcomingDeadline[] | null;
  if (deadlines && deadlines.length > 0) {
    const urgentDeadlines = deadlines.filter((d) => d.priority === "urgent");
    const soonDeadlines = deadlines.filter((d) => d.priority === "soon");

    if (urgentDeadlines.length > 0 || soonDeadlines.length > 0) {
      const deadlineLines: string[] = [];

      if (urgentDeadlines.length > 0) {
        const urgent = urgentDeadlines
          .slice(0, 3)
          .map((d) => `⚠️ ${d.label} (${d.daysUntil} days)`)
          .join("\n");
        deadlineLines.push(`URGENT:\n${urgent}`);
      }

      if (soonDeadlines.length > 0) {
        const soon = soonDeadlines
          .slice(0, 3)
          .map((d) => `${d.label} (${d.daysUntil} days)`)
          .join("\n");
        deadlineLines.push(`Coming up:\n${soon}`);
      }

      sections.push(`## Deadline Awareness\n${deadlineLines.join("\n\n")}`);
    }
  }

  // Section 3: Accountability note
  if (context?.accountabilityLevel === "high") {
    sections.push(
      "_Student prefers HIGH ACCOUNTABILITY - be proactive about follow-ups and challenges._"
    );
  } else if (context?.accountabilityLevel === "light") {
    sections.push(
      "_Student prefers LIGHT TOUCH - gentle suggestions only, respect their autonomy._"
    );
  }

  return sections.join("\n\n");
}

/**
 * Objectives for first-time students
 */
function buildFirstTimeObjectives(): string {
  return `## Session Objectives
1. Welcome warmly and learn their name
2. Understand what grade they're in and their timeline
3. Find out what brings them here today
4. Start building rapport and trust

_This is a new student. Focus on making them feel comfortable and understood._`;
}

/**
 * Fallback rule-based objectives when no AI-generated ones exist
 */
function buildFallbackObjectives(
  profile: ProfileForObjectives,
  context: {
    openCommitments?: string | null;
    accountabilityLevel?: string;
    lastConversationAt?: Date | null;
  } | null
): string {
  const objectives: string[] = [];

  // Days since last conversation
  const daysSinceLastSession = context?.lastConversationAt
    ? Math.floor(
        (Date.now() - new Date(context.lastConversationAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  // Priority 1: Follow up on open commitments
  if (context?.openCommitments && context.accountabilityLevel !== "light") {
    objectives.push("Follow up on open commitments from last session");
  }

  // Priority 2: Re-engagement after break
  if (daysSinceLastSession !== null && daysSinceLastSession > 7) {
    objectives.push(
      `Reconnect warmly (${daysSinceLastSession} days since last chat)`
    );
  }

  // Priority 3: Profile gaps
  const hasGpa =
    profile.academics?.schoolReportedGpaUnweighted ||
    profile.academics?.schoolReportedGpaWeighted;
  const hasTests = !!profile.testing;
  const hasActivities = profile.activities && profile.activities.length > 0;
  const hasSchools = profile.schoolList && profile.schoolList.length > 0;

  if (!hasGpa) objectives.push("Learn their GPA if it comes up naturally");
  if (!hasTests) objectives.push("Find out about standardized testing plans");
  if (!hasActivities) objectives.push("Discover their extracurricular activities");
  if (!hasSchools) objectives.push("Explore what schools interest them");

  // Priority 4: Active goals
  if (profile.goals && profile.goals.length > 0) {
    const inProgress = profile.goals.filter(
      (g: { status: string }) => g.status === "in_progress"
    );
    if (inProgress.length > 0) {
      objectives.push(`Check progress on: "${inProgress[0].title}"`);
    }
  }

  // Default objectives if profile is mostly complete
  if (objectives.length === 0) {
    objectives.push("Help with whatever the student needs today");
    objectives.push("Look for opportunities to deepen their profile");
  }

  const objectivesList = objectives
    .slice(0, 5)
    .map((o, i) => `${i + 1}. ${o}`)
    .join("\n");

  return `## Session Objectives\n${objectivesList}\n\n_Objectives will be AI-personalized after this session._`;
}

/**
 * Triggers objective regeneration.
 * Delegates to the generate module.
 */
export async function regenerateObjectives(profileId: string): Promise<void> {
  const { triggerObjectiveGeneration } = await import(
    "@/lib/objectives/generate"
  );
  triggerObjectiveGeneration(profileId);
}
