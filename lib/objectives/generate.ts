/**
 * AI-Powered Objective Generation
 *
 * Generates personalized session objectives for the advisor.
 * Runs in the background on login and after conversations end.
 */

import { prisma } from "@/lib/db";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

const anthropic = createAnthropic();

// Use Haiku for fast, cost-effective objective generation
const OBJECTIVES_MODEL = anthropic("claude-3-5-haiku-latest");

// =============================================================================
// TYPES
// =============================================================================

type UpcomingDeadline = {
  type: "application" | "goal" | "task" | "test";
  label: string;
  date: string;
  daysUntil: number;
  priority: "urgent" | "soon" | "upcoming";
};

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Generate objectives for the next conversation.
 * Called on login (background) and after conversation ends.
 */
export async function generateObjectives(profileId: string): Promise<void> {
  const startTime = Date.now();
  console.log(`[Objectives] Generating for profile ${profileId}`);

  try {
    // Load all context needed for objective generation
    const [profile, context, deadlines] = await Promise.all([
      loadProfileForObjectives(profileId),
      loadStudentContext(profileId),
      computeUpcomingDeadlines(profileId),
    ]);

    if (!profile) {
      console.log(`[Objectives] No profile found for ${profileId}`);
      return;
    }

    // Build the prompt for AI
    const prompt = buildObjectivesPrompt(profile, context, deadlines);

    // Generate objectives using AI
    const result = await generateText({
      model: OBJECTIVES_MODEL,
      prompt,
      temperature: 0.4,
      maxOutputTokens: 400,
    });

    // Parse the objectives (expecting plain text, numbered list)
    const objectives = result.text.trim();

    // Save objectives and deadlines to StudentContext
    await prisma.studentContext.upsert({
      where: { studentProfileId: profileId },
      update: {
        generatedObjectives: objectives,
        objectivesGeneratedAt: new Date(),
        upcomingDeadlines: deadlines,
      },
      create: {
        studentProfileId: profileId,
        generatedObjectives: objectives,
        objectivesGeneratedAt: new Date(),
        upcomingDeadlines: deadlines,
      },
    });

    console.log(
      `[Objectives] Generated in ${Date.now() - startTime}ms for ${profileId}`
    );
  } catch (error) {
    console.error(`[Objectives] Generation failed for ${profileId}:`, error);
    // Don't throw - this is a background operation
  }
}

/**
 * Fire-and-forget trigger for objective generation.
 */
export function triggerObjectiveGeneration(profileId: string): void {
  generateObjectives(profileId).catch((err) => {
    console.error(`[Objectives] Background generation failed:`, err);
  });
}

// =============================================================================
// CONTEXT LOADING
// =============================================================================

async function loadProfileForObjectives(profileId: string) {
  return prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: {
      firstName: true,
      preferredName: true,
      grade: true,
      academics: {
        select: {
          schoolReportedGpaUnweighted: true,
          schoolReportedGpaWeighted: true,
        },
      },
      testing: {
        select: {
          satScores: { take: 1, orderBy: { total: "desc" } },
          actScores: { take: 1, orderBy: { composite: "desc" } },
        },
      },
      activities: {
        take: 5,
        orderBy: { displayOrder: "asc" },
        select: { title: true, isLeadership: true, isSpike: true },
      },
      awards: {
        take: 3,
        select: { title: true, level: true },
      },
      goals: {
        where: { status: { in: ["in_progress", "planning"] } },
        take: 5,
        include: {
          tasks: {
            where: { status: { not: "completed" } },
            take: 3,
          },
        },
      },
      schoolList: {
        take: 5,
        orderBy: { displayOrder: "asc" },
        include: {
          school: { select: { name: true } },
        },
      },
      aboutMe: {
        select: {
          aspirations: true,
          interests: true,
        },
      },
    },
  });
}

async function loadStudentContext(profileId: string) {
  return prisma.studentContext.findUnique({
    where: { studentProfileId: profileId },
    select: {
      quickContext: true,
      studentUnderstanding: true,
      openCommitments: true,
      accountabilityLevel: true,
      lastConversationAt: true,
      totalConversations: true,
    },
  });
}

// =============================================================================
// DEADLINE COMPUTATION
// =============================================================================

async function computeUpcomingDeadlines(
  profileId: string
): Promise<UpcomingDeadline[]> {
  const now = new Date();
  const deadlines: UpcomingDeadline[] = [];

  // Load goals with target dates
  const goals = await prisma.goal.findMany({
    where: {
      studentProfileId: profileId,
      status: { in: ["in_progress", "planning"] },
      targetDate: { not: null },
    },
    select: {
      title: true,
      targetDate: true,
      tasks: {
        where: {
          dueDate: { not: null },
          status: { not: "completed" },
        },
        select: {
          title: true,
          dueDate: true,
        },
      },
    },
  });

  // Add goal deadlines
  for (const goal of goals) {
    if (goal.targetDate) {
      const daysUntil = Math.ceil(
        (goal.targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil >= 0 && daysUntil <= 90) {
        deadlines.push({
          type: "goal",
          label: goal.title,
          date: goal.targetDate.toISOString(),
          daysUntil,
          priority: getPriority(daysUntil),
        });
      }
    }

    // Add task deadlines
    for (const task of goal.tasks) {
      if (task.dueDate) {
        const daysUntil = Math.ceil(
          (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil >= 0 && daysUntil <= 30) {
          deadlines.push({
            type: "task",
            label: task.title,
            date: task.dueDate.toISOString(),
            daysUntil,
            priority: getPriority(daysUntil),
          });
        }
      }
    }
  }

  // Load school application deadlines (deadlines are in SchoolDeadlineYear)
  const currentYear = new Date().getFullYear();
  const currentCycle = currentYear + 1; // Fall 2025 = applying in 2024-25

  const schools = await prisma.studentSchool.findMany({
    where: {
      studentProfileId: profileId,
      status: { in: ["researching", "planning", "in_progress"] },
      schoolId: { not: null }, // Only linked schools (not custom)
    },
    select: {
      applicationType: true,
      school: {
        select: {
          name: true,
          isRestrictiveEarlyAction: true,
          deadlineYears: {
            where: { admissionsCycle: currentCycle },
            take: 1,
          },
        },
      },
    },
  });

  for (const entry of schools) {
    // Get relevant deadline based on application type
    const appType = entry.applicationType;
    // Skip if no linked school (should not happen due to filter, but TypeScript safety)
    if (!entry.school) continue;
    const yearDeadlines = entry.school.deadlineYears[0];
    if (!yearDeadlines) continue;

    let deadline: Date | null = null;
    let label = entry.school.name;

    if (appType === "ed" && yearDeadlines.deadlineEd) {
      deadline = yearDeadlines.deadlineEd;
      label = `${entry.school.name} (ED)`;
    } else if (appType === "ed2" && yearDeadlines.deadlineEd2) {
      deadline = yearDeadlines.deadlineEd2;
      label = `${entry.school.name} (ED2)`;
    } else if ((appType === "ea" || appType === "rea") && yearDeadlines.deadlineEa) {
      deadline = yearDeadlines.deadlineEa;
      label = `${entry.school.name} (${entry.school.isRestrictiveEarlyAction ? "REA" : "EA"})`;
    } else if (yearDeadlines.deadlineRd) {
      // Default to RD deadline
      deadline = yearDeadlines.deadlineRd;
      label = `${entry.school.name} (RD)`;
    }

    if (deadline) {
      const daysUntil = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil >= 0 && daysUntil <= 90) {
        deadlines.push({
          type: "application",
          label,
          date: deadline.toISOString(),
          daysUntil,
          priority: getPriority(daysUntil),
        });
      }
    }
  }

  // Sort by date (soonest first)
  deadlines.sort((a, b) => a.daysUntil - b.daysUntil);

  // Return top 10 deadlines
  return deadlines.slice(0, 10);
}

function getPriority(daysUntil: number): "urgent" | "soon" | "upcoming" {
  if (daysUntil <= 7) return "urgent";
  if (daysUntil <= 30) return "soon";
  return "upcoming";
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

function buildObjectivesPrompt(
  profile: Awaited<ReturnType<typeof loadProfileForObjectives>>,
  context: Awaited<ReturnType<typeof loadStudentContext>>,
  deadlines: UpcomingDeadline[]
): string {
  const name = profile?.preferredName || profile?.firstName || "Student";
  const grade = profile?.grade || "unknown grade";

  // Build profile summary
  const profileParts: string[] = [`${name}, ${grade}`];

  if (profile?.academics?.schoolReportedGpaUnweighted) {
    profileParts.push(`GPA: ${profile.academics.schoolReportedGpaUnweighted}`);
  }

  const sat = profile?.testing?.satScores?.[0]?.total;
  const act = profile?.testing?.actScores?.[0]?.composite;
  if (sat) profileParts.push(`SAT: ${sat}`);
  if (act) profileParts.push(`ACT: ${act}`);

  // Activities
  const activities =
    profile?.activities
      ?.slice(0, 3)
      .map((a: { title: string }) => a.title) || [];
  if (activities.length > 0) {
    profileParts.push(`Activities: ${activities.join(", ")}`);
  }

  // School list
  const schools =
    profile?.schoolList
      ?.filter((s: { school: { name: string } | null }) => s.school)
      ?.slice(0, 3)
      .map((s: { school: { name: string } | null; customName?: string | null }) =>
        s.school?.name || s.customName || "Unknown"
      ) || [];
  if (schools.length > 0) {
    profileParts.push(`Target schools: ${schools.join(", ")}`);
  }

  // Active goals
  const goals =
    profile?.goals?.map((g: { title: string }) => g.title) || [];
  if (goals.length > 0) {
    profileParts.push(`Working on: ${goals.join(", ")}`);
  }

  // Format deadlines
  const deadlineStr =
    deadlines.length > 0
      ? deadlines
          .slice(0, 5)
          .map((d) => `- ${d.label}: ${d.daysUntil} days (${d.priority})`)
          .join("\n")
      : "No upcoming deadlines tracked.";

  // Days since last conversation
  const daysSince = context?.lastConversationAt
    ? Math.floor(
        (Date.now() - new Date(context.lastConversationAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const sessionContext = daysSince !== null
    ? daysSince === 0
      ? "Last conversation: earlier today"
      : daysSince === 1
        ? "Last conversation: yesterday"
        : `Last conversation: ${daysSince} days ago`
    : "First conversation ever";

  const accountabilityNote =
    context?.accountabilityLevel === "high"
      ? "Student prefers HIGH ACCOUNTABILITY - be proactive about follow-ups."
      : context?.accountabilityLevel === "light"
        ? "Student prefers LIGHT TOUCH - gentle suggestions only."
        : "";

  return `You are setting objectives for an AI college counselor's next session with a student.

STUDENT PROFILE:
${profileParts.join(". ")}

UNDERSTANDING OF STUDENT:
${context?.studentUnderstanding || "No prior understanding yet - still getting to know them."}

OPEN COMMITMENTS:
${context?.openCommitments || "No open commitments tracked."}

UPCOMING DEADLINES:
${deadlineStr}

SESSION CONTEXT:
${sessionContext}
Total conversations so far: ${context?.totalConversations || 0}
${accountabilityNote}

Generate 3-5 specific, actionable objectives for the next conversation. These should be:
1. Personalized to THIS student's situation
2. Aware of upcoming deadlines and urgency
3. Building on previous conversations (if any)
4. Focused on moving them forward, not just gathering info

Format as a numbered list. Be specific, not generic.
Example good objective: "Follow up on Stanford essay draft they committed to finishing by Friday"
Example bad objective: "Help with college applications"

Objectives:`;
}
