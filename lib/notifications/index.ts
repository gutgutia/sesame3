/**
 * Notification Engine
 *
 * LLM-based proactive notification system for Sesame3.
 */

export { processRecipient, runDailyNotificationBatch } from "./engine";
export { buildNotificationInput, getActiveStudentsForNotifications } from "./context";
export type {
  NotificationRecipient,
  NotificationDecision,
  NotificationEngineResult,
  BatchNotificationResult,
  RecipientType,
  NotificationType,
} from "./types";
