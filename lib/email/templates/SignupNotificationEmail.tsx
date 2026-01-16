/**
 * Signup Notification Email Template
 *
 * Sent to admin when a new user signs up
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface SignupNotificationEmailProps {
  userEmail: string;
  signupTime?: Date;
}

export function SignupNotificationEmail({
  userEmail,
  signupTime = new Date(),
}: SignupNotificationEmailProps) {
  const formattedTime = signupTime.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <Html>
      <Head />
      <Preview>New user signup: {userEmail}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <Img
              src="https://sesame3.com/brand/sesame3-mark-192.png"
              width="56"
              height="56"
              alt="Sesame3"
              style={logoImage}
            />
          </Section>

          {/* Header */}
          <Heading style={heading}>New User Signup</Heading>

          {/* Main content */}
          <Section style={infoBox}>
            <Text style={label}>Email</Text>
            <Text style={value}>{userEmail}</Text>

            <Text style={label}>Signed up at</Text>
            <Text style={value}>{formattedTime}</Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated notification from Sesame3.
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

const logoImage = {
  borderRadius: "12px",
  margin: "0 auto",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const infoBox = {
  backgroundColor: "#f9f9f9",
  borderRadius: "8px",
  padding: "20px 24px",
  margin: "0 0 24px",
};

const label = {
  color: "#666666",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const value = {
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0 0 16px",
};

const footer = {
  borderTop: "1px solid #eeeeee",
  paddingTop: "24px",
  marginTop: "8px",
};

const footerText = {
  color: "#999999",
  fontSize: "13px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
};

export default SignupNotificationEmail;
