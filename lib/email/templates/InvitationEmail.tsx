/**
 * Account Access Invitation Email Template
 *
 * Sent when someone is invited to access a student's profile
 */

import {
  Body,
  Button,
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

interface InvitationEmailProps {
  inviterName: string;
  studentName: string;
  invitationUrl: string;
}

export function InvitationEmail({
  inviterName,
  studentName,
  invitationUrl,
}: InvitationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        You&apos;ve been invited to view {studentName}&apos;s college prep profile on Sesame3
      </Preview>
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
          <Heading style={heading}>You&apos;re Invited!</Heading>

          {/* Intro text */}
          <Text style={paragraph}>
            <strong>{inviterName}</strong> has invited you to view{" "}
            <strong>{studentName}&apos;s</strong> college prep profile on Sesame3.
          </Text>

          <Text style={paragraph}>
            You&apos;ll be able to follow along with their college preparation journey,
            including their profile, school list, and goals.
          </Text>

          {/* CTA Button */}
          <Section style={buttonContainer}>
            <Button style={button} href={invitationUrl}>
              Accept Invitation
            </Button>
          </Section>

          {/* Expiry notice */}
          <Text style={subtext}>
            This invitation expires in 7 days. Click the button above or copy this link:
          </Text>
          <Text style={linkText}>
            <Link href={invitationUrl} style={link}>
              {invitationUrl}
            </Link>
          </Text>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              If you weren&apos;t expecting this invitation, you can safely ignore this email.
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

const logoImage = {
  borderRadius: "12px",
  margin: "0 auto",
};

const _logoBox = {
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
  margin: "0 0 16px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#0d9373",
  borderRadius: "8px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "16px",
  fontWeight: "600",
  padding: "14px 32px",
  textDecoration: "none",
};

const subtext = {
  color: "#999999",
  fontSize: "14px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const linkText = {
  color: "#999999",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 32px",
  wordBreak: "break-all" as const,
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

export default InvitationEmail;
