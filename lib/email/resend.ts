/**
 * Resend Email Client
 *
 * Handles all email sending for Sesame3:
 * - OTP verification codes
 * - Welcome emails
 * - Transactional emails
 */

import { Resend } from "resend";

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("[Email] RESEND_API_KEY not configured - emails will not be sent");
}

export const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Email sender configuration
export const EMAIL_FROM = "Sesame3 <noreply@sesame3.com>";
export const EMAIL_REPLY_TO = "support@sesame3.com";

/**
 * Send an email via Resend
 */
export async function sendEmail({
  to,
  subject,
  react,
  text,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
  text?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured, skipping email to:", to);
    return { success: false, error: "Email not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      react,
      text,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true };
  } catch (err) {
    console.error("[Email] Exception:", err);
    return { success: false, error: "Failed to send email" };
  }
}

/**
 * Generate a random 6-digit OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get OTP expiry time (10 minutes from now)
 */
export function getOTPExpiry(): Date {
  return new Date(Date.now() + 10 * 60 * 1000);
}
