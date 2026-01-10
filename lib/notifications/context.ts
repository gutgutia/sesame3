/**
 * Notification Context Assembly
 *
 * Gathers all context needed for the notification engine to make decisions.
 */

import { prisma } from "@/lib/db";
import type {
  NotificationRecipient,
  StudentNotificationContext,
  Deadline,
  Goal,
  PastNotification,
  NotificationEngineInput,
} from "./types";
import {
  NOTIFICATION_SYSTEM_PROMPT,
  getTimeOfYear,
  getDayOfWeek,
} from "./prompts";

// =============================================================================
// MAIN CONTEXT BUILDER
// =============================================================================

/**
 * Build the complete input for the notification engine for a given user.
 */
export async function buildNotificationInput(
  userId: string
): Promise<NotificationEngineInput | null> {
  const now = new Date();

  // Load user and determine recipient type
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      notificationPreferences: true,
      studentProfile: {
        select: {
          id: true,
          firstName: true,
          preferredName: true,
          grade: true,
        },
      },
      // Check if they have access grants to other profiles (makes them a parent/viewer)
      accessGrantsReceived: {
        where: { revokedAt: null },
        select: {
          studentProfileId: true,
          relationship: true,
          studentProfile: {
            select: {
              firstName: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Determine recipient type and build recipient object
  const recipient = await buildRecipient(user);
  if (!recipient) {
    return null;
  }

  // Load recent notifications to avoid repetition
  const recentNotifications = await loadRecentNotifications(userId, 5);

  return {
    currentDate: now.toISOString().split("T")[0],
    dayOfWeek: getDayOfWeek(now),
    timeOfYear: getTimeOfYear(now),
    recipient,
    systemInstructions: NOTIFICATION_SYSTEM_PROMPT,
    recentNotifications,
  };
}

// =============================================================================
// RECIPIENT BUILDING
// =============================================================================

type UserWithProfile = {
  id: string;
  email: string;
  name: string | null;
  notificationPreferences: string | null;
  studentProfile: {
    id: string;
    firstName: string;
    preferredName: string | null;
    grade: string | null;
  } | null;
  accessGrantsReceived: {
    studentProfileId: string;
    relationship: string | null;
    studentProfile: {
      firstName: string;
    };
  }[];
};

async function buildRecipient(
  user: UserWithProfile
): Promise<NotificationRecipient | null> {
  // If user has their own student profile, they're a student
  if (user.studentProfile) {
    const studentContext = await buildStudentContext(user.studentProfile.id);

    return {
      id: user.id,
      type: "student",
      name: user.studentProfile.preferredName || user.studentProfile.firstName,
      email: user.email,
      preferences: user.notificationPreferences,
      studentContext,
    };
  }

  // If user has access grants, they're a parent/viewer
  // For now, we'll skip parents - implement later
  if (user.accessGrantsReceived.length > 0) {
    // TODO: Implement parent notifications
    // For now, return null to skip
    return null;
  }

  // User has no profile and no access grants - skip
  return null;
}

// =============================================================================
// STUDENT CONTEXT BUILDING
// =============================================================================

async function buildStudentContext(
  profileId: string
): Promise<StudentNotificationContext> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Load profile basics
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: {
      firstName: true,
      preferredName: true,
      grade: true,
      user: {
        select: {
          lastLoginAt: true,
        },
      },
      studentContext: {
        select: {
          lastConversationAt: true,
        },
      },
    },
  });

  // Load deadlines
  const deadlines = await computeUpcomingDeadlines(profileId);

  // Categorize deadlines
  const urgentDeadlines = deadlines.filter((d) => d.daysUntil <= 3);
  const soonDeadlines = deadlines.filter(
    (d) => d.daysUntil > 3 && d.daysUntil <= 7
  );
  const upcomingDeadlines = deadlines.filter(
    (d) => d.daysUntil > 7 && d.daysUntil <= 30
  );

  // Load goals
  const goals = await prisma.goal.findMany({
    where: {
      studentProfileId: profileId,
      status: { in: ["in_progress", "planning"] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      targetDate: true,
      updatedAt: true,
      tasks: {
        select: {
          status: true,
        },
      },
    },
    take: 10,
  });

  const activeGoals: Goal[] = goals.map((g) => {
    const totalTasks = g.tasks.length;
    const completedTasks = g.tasks.filter(
      (t) => t.status === "completed"
    ).length;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      id: g.id,
      title: g.title,
      status: g.status,
      targetDate: g.targetDate?.toISOString() || null,
      progress: Math.round(progress),
      lastUpdated: g.updatedAt.toISOString(),
    };
  });

  // Count overdue tasks
  const overdueTaskCount = await prisma.task.count({
    where: {
      studentProfileId: profileId,
      status: { not: "completed" },
      dueDate: { lt: now },
    },
  });

  // Count recently completed tasks
  const recentlyCompletedCount = await prisma.task.count({
    where: {
      studentProfileId: profileId,
      status: "completed",
      completedAt: { gte: sevenDaysAgo },
    },
  });

  // Load school list stats
  const schoolList = await prisma.studentSchool.findMany({
    where: {
      studentProfileId: profileId,
    },
    select: {
      status: true,
    },
  });

  const schoolCount = schoolList.length;
  const submittedCount = schoolList.filter(
    (s) => s.status === "submitted"
  ).length;
  const applicationProgress =
    schoolCount > 0
      ? `${submittedCount} of ${schoolCount} apps submitted`
      : "No schools on list yet";

  // Calculate days inactive
  const lastLoginAt = profile?.user?.lastLoginAt;
  const daysInactive = lastLoginAt
    ? Math.floor(
        (now.getTime() - new Date(lastLoginAt).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 999;

  // Build recent achievements (for celebration notifications)
  const recentAchievements: string[] = [];

  if (recentlyCompletedCount >= 3) {
    recentAchievements.push(
      `Completed ${recentlyCompletedCount} tasks this week`
    );
  }

  if (submittedCount > 0) {
    recentAchievements.push(`Submitted ${submittedCount} applications`);
  }

  // Check for any completed goals recently
  const recentlyCompletedGoals = await prisma.goal.count({
    where: {
      studentProfileId: profileId,
      status: "completed",
      updatedAt: { gte: sevenDaysAgo },
    },
  });

  if (recentlyCompletedGoals > 0) {
    recentAchievements.push(`Completed ${recentlyCompletedGoals} goals`);
  }

  return {
    profileId,
    firstName: profile?.preferredName || profile?.firstName || "Student",
    grade: profile?.grade || null,
    urgentDeadlines,
    soonDeadlines,
    upcomingDeadlines,
    activeGoals,
    overdueTaskCount,
    recentlyCompletedCount,
    lastLoginAt: lastLoginAt?.toISOString() || null,
    lastAdvisorChatAt:
      profile?.studentContext?.lastConversationAt?.toISOString() || null,
    daysInactive,
    schoolCount,
    applicationProgress,
    recentAchievements,
  };
}

// =============================================================================
// DEADLINE COMPUTATION (adapted from lib/objectives/generate.ts)
// =============================================================================

async function computeUpcomingDeadlines(profileId: string): Promise<Deadline[]> {
  const now = new Date();
  const deadlines: Deadline[] = [];

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

  // Load school application deadlines
  const currentYear = new Date().getFullYear();
  const currentCycle = currentYear + 1;

  const schools = await prisma.studentSchool.findMany({
    where: {
      studentProfileId: profileId,
      status: { in: ["researching", "planning", "in_progress"] },
      schoolId: { not: null },
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
    const appType = entry.applicationType;
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
    } else if (
      (appType === "ea" || appType === "rea") &&
      yearDeadlines.deadlineEa
    ) {
      deadline = yearDeadlines.deadlineEa;
      label = `${entry.school.name} (${entry.school.isRestrictiveEarlyAction ? "REA" : "EA"})`;
    } else if (yearDeadlines.deadlineRd) {
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

  // Sort by date
  deadlines.sort((a, b) => a.daysUntil - b.daysUntil);

  return deadlines.slice(0, 15);
}

function getPriority(daysUntil: number): "urgent" | "soon" | "upcoming" {
  if (daysUntil <= 3) return "urgent";
  if (daysUntil <= 7) return "soon";
  return "upcoming";
}

// =============================================================================
// NOTIFICATION HISTORY
// =============================================================================

async function loadRecentNotifications(
  userId: string,
  limit: number
): Promise<PastNotification[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      status: "sent",
    },
    orderBy: { sentAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      sentAt: true,
      mobileMessage: true,
      emailSubject: true,
    },
  });

  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    sentAt: n.sentAt?.toISOString() || new Date().toISOString(),
    mobileMessage: n.mobileMessage,
    emailSubject: n.emailSubject,
  }));
}

// =============================================================================
// GET ALL STUDENTS FOR DAILY RUN
// =============================================================================

/**
 * Get all active students who should be considered for notifications.
 * Returns user IDs.
 */
export async function getActiveStudentsForNotifications(): Promise<string[]> {
  // Get all users who have student profiles and have logged in recently (last 30 days)
  // Also exclude users who may have opted out entirely
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const users = await prisma.user.findMany({
    where: {
      studentProfile: { isNot: null },
      // Must have logged in within last 30 days (otherwise they're likely churned)
      lastLoginAt: { gte: thirtyDaysAgo },
      // Don't include test/demo accounts
      email: {
        not: { contains: "+test" },
      },
    },
    select: {
      id: true,
    },
  });

  return users.map((u) => u.id);
}
