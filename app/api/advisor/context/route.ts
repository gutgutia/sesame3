import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";

/**
 * GET /api/advisor/context
 * Returns the advisor sidebar context data:
 * - Profile snapshot
 * - Session objectives
 * - Upcoming deadlines
 * - Open commitments
 * - Active goals
 */
export async function GET() {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Load profile snapshot
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      select: {
        firstName: true,
        preferredName: true,
        grade: true,
        highSchoolName: true,
        academics: {
          select: {
            schoolReportedGpaUnweighted: true,
            schoolReportedGpaWeighted: true,
          },
        },
        testing: {
          select: {
            satScores: {
              take: 1,
              orderBy: { total: "desc" },
              select: { total: true },
            },
            actScores: {
              take: 1,
              orderBy: { composite: "desc" },
              select: { composite: true },
            },
          },
        },
        goals: {
          where: { status: { in: ["in_progress", "planning"] } },
          take: 5,
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            tasks: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    // Load student context (objectives, commitments, deadlines)
    const context = await prisma.studentContext.findUnique({
      where: { studentProfileId: profileId },
      select: {
        generatedObjectives: true,
        objectivesGeneratedAt: true,
        upcomingDeadlines: true,
        openCommitments: true,
        lastConversationAt: true,
        totalConversations: true,
      },
    });

    // Trigger objective generation if none exist (fire-and-forget)
    if (!context?.generatedObjectives) {
      import("@/lib/objectives/generate").then(({ triggerObjectiveGeneration }) => {
        triggerObjectiveGeneration(profileId);
        console.log(`[AdvisorContext] Triggered initial objective generation for ${profileId}`);
      }).catch(() => {});
    }

    // Format the response
    const name = profile?.preferredName || profile?.firstName || "Student";
    const gpa =
      profile?.academics?.schoolReportedGpaUnweighted ||
      profile?.academics?.schoolReportedGpaWeighted;
    const sat = profile?.testing?.satScores?.[0]?.total;
    const act = profile?.testing?.actScores?.[0]?.composite;

    // Parse objectives into array (handle numbered, bulleted, or plain lines)
    // Filter out header lines like "Objectives for Next AI College Counselor Session with Alex:"
    const objectivesText = context?.generatedObjectives || "";
    const objectives = objectivesText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0)
      .filter((line: string) => !line.toLowerCase().includes("objectives for"))
      .filter((line: string) => !line.toLowerCase().includes("session with"))
      .map((line: string) => line.replace(/^(\d+\.|[-•*])\s*/, "").trim())
      .filter((line: string) => line.length > 0 && !line.endsWith(":"))
      .slice(0, 4);

    // Parse commitments into array (strip leading "- " if present)
    const commitmentsText = context?.openCommitments || "";
    const commitments = commitmentsText
      .split("\n")
      .filter((line: string) => line.trim().length > 0)
      .map((line: string) => line.replace(/^-\s*/, "").trim())
      .slice(0, 3);

    // Format deadlines
    type DeadlineInput = {
      label: string;
      daysUntil: number;
      priority: string;
      type: string;
    };
    const deadlines = (
      (context?.upcomingDeadlines as DeadlineInput[]) || []
    ).slice(0, 4);

    // Format goals with progress
    type GoalWithTasks = {
      id: string;
      title: string;
      status: string;
      category: string | null;
      tasks: Array<{ id: string; status: string | null }>;
    };
    const goals = (profile?.goals || []).map((g: GoalWithTasks) => {
      const totalTasks = g.tasks?.length || 0;
      const completedTasks =
        g.tasks?.filter((t: { status: string | null }) => t.status === "completed").length || 0;
      return {
        id: g.id,
        title: g.title,
        status: g.status,
        category: g.category,
        progress:
          totalTasks > 0
            ? Math.round((completedTasks / totalTasks) * 100)
            : null,
        taskCount: totalTasks,
        completedCount: completedTasks,
      };
    });

    // Days since last conversation
    const daysSinceLastSession = context?.lastConversationAt
      ? Math.floor(
          (Date.now() - new Date(context.lastConversationAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return NextResponse.json({
      profileSnapshot: {
        name,
        grade: profile?.grade,
        school: profile?.highSchoolName,
        gpa,
        sat,
        act,
      },
      objectives,
      objectivesGeneratedAt: context?.objectivesGeneratedAt,
      deadlines,
      commitments,
      goals,
      sessionInfo: {
        daysSinceLastSession,
        totalConversations: context?.totalConversations || 0,
      },
    });
  } catch (error) {
    console.error("[AdvisorContext] Error:", error);
    return NextResponse.json(
      { error: "Failed to load advisor context" },
      { status: 500 }
    );
  }
}
