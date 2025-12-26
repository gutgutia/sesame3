/**
 * Welcome Email Template
 *
 * Sent after a new user successfully verifies their email and creates an account
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

interface WelcomeEmailProps {
  name?: string;
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  const displayName = name || "there";

  return (
    <Html>
      <Head />
      <Preview>Welcome to Sesame3 - Your college prep journey starts here</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <div style={logoBox}>S3</div>
          </Section>

          {/* Header */}
          <Heading style={heading}>Welcome to Sesame3, {displayName}!</Heading>

          {/* Main content */}
          <Text style={paragraph}>
            We're thrilled to have you on board. Sesame3 is designed to make
            college prep feel manageable, not overwhelming.
          </Text>

          <Text style={paragraph}>Here's what you can do to get started:</Text>

          {/* Feature list */}
          <Section style={featureList}>
            <div style={featureItem}>
              <span style={featureIcon}>📝</span>
              <span style={featureText}>
                <strong>Build your profile</strong> — Add your GPA, test scores,
                and activities
              </span>
            </div>
            <div style={featureItem}>
              <span style={featureIcon}>🎯</span>
              <span style={featureText}>
                <strong>Set goals</strong> — Plan your path with actionable
                milestones
              </span>
            </div>
            <div style={featureItem}>
              <span style={featureIcon}>🏫</span>
              <span style={featureText}>
                <strong>Build your school list</strong> — Discover and track
                colleges that fit you
              </span>
            </div>
            <div style={featureItem}>
              <span style={featureIcon}>💬</span>
              <span style={featureText}>
                <strong>Chat with your advisor</strong> — Get personalized
                guidance anytime
              </span>
            </div>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={button} href="https://sesame3.com">
              Get Started
            </Button>
          </Section>

          {/* Closing */}
          <Text style={paragraph}>
            Remember, college prep doesn't have to be stressful. Take it one
            step at a time, and we'll be here to help along the way.
          </Text>

          <Text style={signature}>
            — The Sesame3 Team
          </Text>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              <Link href="https://sesame3.com" style={link}>
                Sesame3
              </Link>{" "}
              — College prep, without the panic.
            </Text>
            <Text style={footerText}>
              Questions? Just reply to this email or reach out to{" "}
              <Link href="mailto:support@sesame3.com" style={link}>
                support@sesame3.com
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
  marginBottom: "24px",
};

const logoBox = {
  display: "inline-block",
  backgroundColor: "#1a1a1a",
  color: "#ffffff",
  fontWeight: "bold",
  fontSize: "18px",
  padding: "12px 16px",
  borderRadius: "10px",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "26px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const paragraph = {
  color: "#444444",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 20px",
};

const featureList = {
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  padding: "20px 24px",
  margin: "0 0 24px",
};

const featureItem = {
  display: "flex",
  alignItems: "flex-start",
  marginBottom: "16px",
};

const featureIcon = {
  fontSize: "18px",
  marginRight: "12px",
  flexShrink: 0,
};

const featureText = {
  color: "#444444",
  fontSize: "15px",
  lineHeight: "22px",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#1a1a1a",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "14px 32px",
};

const signature = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "500",
  margin: "24px 0 0",
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

export default WelcomeEmail;
