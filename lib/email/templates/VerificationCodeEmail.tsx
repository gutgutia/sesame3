/**
 * Verification Code Email Template
 *
 * Sent when a user requests to log in or sign up
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface VerificationCodeEmailProps {
  code: string;
  email: string;
}

export function VerificationCodeEmail({
  code,
  email,
}: VerificationCodeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your Sesame3 verification code is {code}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          <Section style={logoSection}>
            <div style={logoBox}>S3</div>
          </Section>

          {/* Header */}
          <Heading style={heading}>Your verification code</Heading>

          {/* Intro text */}
          <Text style={paragraph}>
            Enter this code to continue to your Sesame3 account:
          </Text>

          {/* Code box */}
          <Section style={codeContainer}>
            <Text style={codeText}>{code}</Text>
          </Section>

          {/* Expiry notice */}
          <Text style={subtext}>
            This code expires in 10 minutes. If you didn't request this code,
            you can safely ignore this email.
          </Text>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Sent to {email}
            </Text>
            <Text style={footerText}>
              <Link href="https://sesame3.com" style={link}>
                Sesame3
              </Link>{" "}
              — College prep, without the panic.
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
  maxWidth: "480px",
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
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const paragraph = {
  color: "#666666",
  fontSize: "16px",
  lineHeight: "24px",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const codeContainer = {
  backgroundColor: "#f0f9f7",
  border: "1px solid #d0ebe5",
  borderRadius: "8px",
  padding: "24px",
  margin: "0 0 24px",
  textAlign: "center" as const,
};

const codeText = {
  color: "#1a1a1a",
  fontSize: "36px",
  fontWeight: "bold",
  fontFamily: "monospace",
  letterSpacing: "8px",
  margin: "0",
};

const subtext = {
  color: "#999999",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const footer = {
  borderTop: "1px solid #eeeeee",
  paddingTop: "24px",
};

const footerText = {
  color: "#999999",
  fontSize: "12px",
  lineHeight: "18px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const link = {
  color: "#0d9373",
  textDecoration: "none",
};

export default VerificationCodeEmail;
