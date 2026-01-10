/**
 * Notification Email Template
 *
 * Flexible template for proactive notifications from the notification engine.
 * Renders LLM-generated content with consistent styling.
 */

import {
  Body,
  Button,
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
import type { NotificationType } from "@/lib/notifications/types";

interface NotificationEmailProps {
  recipientName: string;
  subject: string;
  body: string; // Can include simple markdown
  notificationType: NotificationType;
}

// Map notification types to emojis for a personal touch
const typeEmojis: Record<NotificationType, string> = {
  deadline_reminder: "📅",
  encouragement: "💪",
  check_in: "👋",
  celebration: "🎉",
  gentle_nudge: "💭",
  weekly_summary: "📋",
  milestone: "🏆",
  none: "",
};

export function NotificationEmail({
  recipientName,
  subject,
  body,
  notificationType,
}: NotificationEmailProps) {
  const emoji = typeEmojis[notificationType] || "";
  const displayName = recipientName || "there";

  // Simple markdown parsing (bold, links)
  const renderBody = (text: string) => {
    // Split by paragraphs
    const paragraphs = text.split(/\n\n+/);

    return paragraphs.map((paragraph, index) => {
      // Handle bullet points
      if (paragraph.trim().startsWith("- ") || paragraph.trim().startsWith("• ")) {
        const items = paragraph.split(/\n/).filter((line) => line.trim());
        return (
          <Section key={index} style={bulletList}>
            {items.map((item, itemIndex) => (
              <Text key={itemIndex} style={bulletItem}>
                {item.replace(/^[-•]\s*/, "• ")}
              </Text>
            ))}
          </Section>
        );
      }

      // Regular paragraph - render with basic markdown
      return (
        <Text key={index} style={paragraph.trim() ? paragraphStyle : spacer}>
          {paragraph}
        </Text>
      );
    });
  };

  return (
    <Html>
      <Head />
      <Preview>
        {emoji} {subject}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <div style={logoBox}>S3</div>
          </Section>

          {/* Greeting */}
          <Heading style={greeting}>
            Hey {displayName}! {emoji}
          </Heading>

          {/* Main content */}
          <Section style={contentSection}>{renderBody(body)}</Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={button} href="https://sesame3.com/dashboard">
              Open Sesame3
            </Button>
          </Section>

          {/* Sign off */}
          <Text style={signOff}>You&apos;ve got this!</Text>
          <Text style={signature}>— Your Sesame3 Team</Text>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <Link href="https://sesame3.com" style={link}>
                Sesame3
              </Link>{" "}
              — College prep, without the panic.
            </Text>
            <Text style={footerText}>
              Want to adjust how often you hear from us?{" "}
              <Link href="https://sesame3.com/settings" style={link}>
                Update your preferences
              </Link>
            </Text>
            <Text style={footerText}>
              <Link href="https://sesame3.com/privacy" style={link}>
                Privacy
              </Link>
              {" · "}
              <Link href="https://sesame3.com/terms" style={link}>
                Terms
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "40px",
  borderRadius: "12px",
  maxWidth: "520px",
};

const logoSection = {
  textAlign: "center" as const,
  marginBottom: "16px",
};

const logoBox = {
  display: "inline-block",
  backgroundColor: "#1a1a1a",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: "16px",
  padding: "10px 14px",
  borderRadius: "8px",
};

const greeting = {
  color: "#1a1a1a",
  fontSize: "22px",
  fontWeight: "600",
  textAlign: "left" as const,
  margin: "0 0 24px",
};

const contentSection = {
  margin: "0 0 24px",
};

const paragraphStyle = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const spacer = {
  margin: "8px 0",
};

const bulletList = {
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "0 0 16px",
};

const bulletItem = {
  color: "#444444",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 8px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "28px 0",
};

const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "15px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 28px",
};

const signOff = {
  color: "#444444",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0 0 4px",
};

const signature = {
  color: "#666666",
  fontSize: "15px",
  margin: "0 0 0",
};

const footer = {
  borderTop: "1px solid #eeeeee",
  paddingTop: "24px",
  marginTop: "32px",
};

const footerText = {
  color: "#999999",
  fontSize: "13px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const link = {
  color: "#0d9373",
  textDecoration: "none",
};

export default NotificationEmail;
