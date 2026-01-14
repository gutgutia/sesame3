/**
 * Feedback Email Template
 *
 * Sent to admin when a user submits feedback.
 * Includes AI-processed summary and debugging context.
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface FeedbackEmailProps {
  feedbackId: string;
  // User info
  userName?: string;
  userEmail?: string;
  // Original feedback
  originalContent: string;
  // AI-processed
  category?: string;
  processedSummary?: string;
  // Context
  pageUrl?: string;
  posthogSessionId?: string;
  userAgent?: string;
  // Metadata
  submittedAt: string;
}

// Category display names and colors
const categoryDisplay: Record<string, { label: string; color: string }> = {
  bug: { label: "Bug Report", color: "#dc2626" },
  feature: { label: "Feature Request", color: "#7c3aed" },
  ux: { label: "UX Issue", color: "#ea580c" },
  content: { label: "Content Issue", color: "#0891b2" },
  praise: { label: "Praise", color: "#16a34a" },
  general: { label: "General Feedback", color: "#6b7280" },
};

export function FeedbackEmail({
  feedbackId,
  userName,
  userEmail,
  originalContent,
  category,
  processedSummary,
  pageUrl,
  posthogSessionId,
  userAgent,
  submittedAt,
}: FeedbackEmailProps) {
  const categoryInfo = category ? categoryDisplay[category] : categoryDisplay.general;
  const posthogUrl = posthogSessionId
    ? `https://us.posthog.com/replay/${posthogSessionId}`
    : null;

  return (
    <Html>
      <Head />
      <Preview>
        [{categoryInfo.label}] New feedback from {userName || "a user"}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <div style={logoBox}>S3</div>
            <Heading style={title}>New User Feedback</Heading>
          </Section>

          {/* Category Badge */}
          <Section style={badgeSection}>
            <span
              style={{
                ...badge,
                backgroundColor: categoryInfo.color,
              }}
            >
              {categoryInfo.label}
            </span>
          </Section>

          {/* User Info */}
          <Section style={infoSection}>
            <Text style={infoLabel}>From</Text>
            <Text style={infoValue}>
              {userName || "Anonymous"} {userEmail && `(${userEmail})`}
            </Text>
          </Section>

          {/* AI Summary (if available) */}
          {processedSummary && (
            <Section style={summarySection}>
              <Text style={sectionTitle}>AI Summary</Text>
              <Text style={summaryText}>{processedSummary}</Text>
            </Section>
          )}

          {/* Original Feedback */}
          <Section style={feedbackSection}>
            <Text style={sectionTitle}>Original Feedback</Text>
            <div style={feedbackBox}>
              <Text style={feedbackText}>{originalContent}</Text>
            </div>
          </Section>

          {/* Context */}
          <Section style={contextSection}>
            <Text style={sectionTitle}>Context</Text>

            {pageUrl && (
              <div style={contextRow}>
                <Text style={contextLabel}>Page:</Text>
                <Text style={contextValue}>{pageUrl}</Text>
              </div>
            )}

            {posthogUrl && (
              <div style={contextRow}>
                <Text style={contextLabel}>Session:</Text>
                <Link href={posthogUrl} style={link}>
                  View in PostHog
                </Link>
              </div>
            )}

            {userAgent && (
              <div style={contextRow}>
                <Text style={contextLabel}>Browser:</Text>
                <Text style={contextValueSmall}>{userAgent}</Text>
              </div>
            )}

            <div style={contextRow}>
              <Text style={contextLabel}>Submitted:</Text>
              <Text style={contextValue}>{submittedAt}</Text>
            </div>

            <div style={contextRow}>
              <Text style={contextLabel}>ID:</Text>
              <Text style={contextValueSmall}>{feedbackId}</Text>
            </div>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This feedback was submitted through Sesame3.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "0",
  borderRadius: "12px",
  maxWidth: "560px",
  overflow: "hidden" as const,
};

const header = {
  backgroundColor: "#1a1a1a",
  padding: "24px 32px",
  textAlign: "center" as const,
};

const logoBox = {
  display: "inline-block",
  backgroundColor: "#ffffff",
  color: "#1a1a1a",
  fontWeight: "bold",
  fontSize: "14px",
  padding: "8px 12px",
  borderRadius: "6px",
  marginBottom: "12px",
};

const title = {
  color: "#ffffff",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0",
};

const badgeSection = {
  padding: "20px 32px 0",
};

const badge = {
  display: "inline-block",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "600",
  padding: "6px 12px",
  borderRadius: "20px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const infoSection = {
  padding: "16px 32px",
  borderBottom: "1px solid #e5e7eb",
};

const infoLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "500",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const infoValue = {
  color: "#1f2937",
  fontSize: "15px",
  fontWeight: "500",
  margin: "0",
};

const summarySection = {
  padding: "20px 32px",
  backgroundColor: "#f0fdf4",
  borderBottom: "1px solid #e5e7eb",
};

const sectionTitle = {
  color: "#374151",
  fontSize: "13px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 12px",
};

const summaryText = {
  color: "#166534",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  fontStyle: "italic" as const,
};

const feedbackSection = {
  padding: "20px 32px",
};

const feedbackBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "16px",
  border: "1px solid #e5e7eb",
};

const feedbackText = {
  color: "#1f2937",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const contextSection = {
  padding: "20px 32px",
  backgroundColor: "#f9fafb",
  borderTop: "1px solid #e5e7eb",
};

const contextRow = {
  marginBottom: "8px",
};

const contextLabel = {
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: "500",
  margin: "0",
  display: "inline",
};

const contextValue = {
  color: "#374151",
  fontSize: "13px",
  margin: "0 0 0 8px",
  display: "inline",
};

const contextValueSmall = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 0 8px",
  display: "inline",
  fontFamily: "monospace",
};

const link = {
  color: "#0d9373",
  fontSize: "13px",
  textDecoration: "none",
  marginLeft: "8px",
};

const footer = {
  padding: "20px 32px",
  borderTop: "1px solid #e5e7eb",
};

const footerText = {
  color: "#9ca3af",
  fontSize: "13px",
  textAlign: "center" as const,
  margin: "0",
};

export default FeedbackEmail;
