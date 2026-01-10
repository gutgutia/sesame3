/**
 * Notification Engine Types
 *
 * Type definitions for the LLM-based proactive notification system.
 */

// =============================================================================
// RECIPIENT TYPES
// =============================================================================

export type RecipientType = "student" | "parent" | "counselor";

export interface NotificationRecipient {
  id: string; // User ID
  type: RecipientType;
  name: string;
  email: string;
  pushToken?: string; // For future mobile push

  // Free-form preferences (interpreted by LLM)
  // e.g., "Don't message me on weekends" or "I prefer encouragement over reminders"
  preferences: string | null;

  // For students: their profile context
  studentContext?: StudentNotificationContext;

  // For parents: which student they're linked to
  linkedStudentId?: string;
  linkedStudentName?: string;
}

// =============================================================================
// STUDENT CONTEXT (for notification decisions)
// =============================================================================

export interface Deadline {
  type: "application" | "goal" | "task" | "test";
  label: string;
  date: string;
  daysUntil: number;
  priority: "urgent" | "soon" | "upcoming";
}

export interface Goal {
  id: string;
  title: string;
  status: string;
  targetDate: string | null;
  progress: number; // 0-100
  lastUpdated: string;
}

export interface StudentNotificationContext {
  profileId: string;
  firstName: string;
  grade: string | null;

  // Deadlines
  urgentDeadlines: Deadline[]; // ≤3 days
  soonDeadlines: Deadline[]; // 4-7 days
  upcomingDeadlines: Deadline[]; // 8-30 days

  // Goals & tasks
  activeGoals: Goal[];
  overdueTaskCount: number;
  recentlyCompletedCount: number; // Last 7 days

  // Engagement
  lastLoginAt: string | null;
  lastAdvisorChatAt: string | null;
  daysInactive: number;

  // School list
  schoolCount: number;
  applicationProgress: string; // e.g., "3 of 8 apps submitted"

  // Recent achievements (for celebration notifications)
  recentAchievements: string[];
}

// =============================================================================
// NOTIFICATION HISTORY
// =============================================================================

export interface PastNotification {
  id: string;
  type: string;
  sentAt: string;
  mobileMessage: string | null;
  emailSubject: string | null;
}

// =============================================================================
// LLM INPUT
// =============================================================================

export interface NotificationEngineInput {
  // Current date/time context
  currentDate: string;
  dayOfWeek: string;
  timeOfYear: string; // "early_fall", "application_season", "summer", etc.

  // The recipient we're evaluating
  recipient: NotificationRecipient;

  // System instructions (admin-configurable, but in code for now)
  systemInstructions: string;

  // Recent notification history (to avoid repetition)
  recentNotifications: PastNotification[];
}

// =============================================================================
// LLM OUTPUT
// =============================================================================

export type NotificationType =
  | "deadline_reminder"
  | "encouragement"
  | "check_in"
  | "celebration"
  | "gentle_nudge"
  | "weekly_summary"
  | "milestone"
  | "none";

export type NotificationUrgency = "high" | "medium" | "low";

export type NotificationChannel = "email" | "mobile" | "both";

export interface NotificationDecision {
  // Should we send a notification today?
  shouldSend: boolean;

  // Why or why not (for logging/debugging)
  reasoning: string;

  // If sending, what type?
  notificationType: NotificationType;

  // How urgent is this?
  urgency: NotificationUrgency;

  // Which channels to use?
  channels: NotificationChannel;

  // The actual messages
  messages: {
    // Mobile push notification (short, ≤160 chars ideally)
    mobile: string;

    // Email content
    email: {
      subject: string;
      body: string; // Can include markdown
    };
  };

  // Optional: link to related entities
  relatedGoalId?: string;
  relatedTaskId?: string;
  relatedSchoolId?: string;
}

// =============================================================================
// ENGINE RESULT
// =============================================================================

export interface NotificationEngineResult {
  recipientId: string;
  decision: NotificationDecision;
  processingTimeMs: number;
}

export interface BatchNotificationResult {
  processedCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  results: NotificationEngineResult[];
  totalTimeMs: number;
}
