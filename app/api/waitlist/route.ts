import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

// Email template for waitlist confirmation
function getWaitlistEmailHTML(email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Sesame3</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8faf9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://sesame3.com/brand/sesame3-primary.png" alt="Sesame3" width="160" style="display: block;" />
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">

              <!-- Header with gradient -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="background: linear-gradient(135deg, #12756A 0%, #0d5a52 100%); padding: 40px 40px 32px; border-radius: 16px 16px 0 0; text-align: center;">
                    <h1 style="margin: 0 0 8px; font-size: 28px; font-weight: 700; color: #ffffff;">
                      You're on the list! 🎉
                    </h1>
                    <p style="margin: 0; font-size: 16px; color: rgba(255, 255, 255, 0.85);">
                      Thanks for joining the Sesame3 waitlist
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Body Content -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                      Hi there,
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                      We're thrilled that you're interested in <strong>Sesame3</strong> — your personal AI college counselor. You've just secured your spot to be among the first to experience a smarter way to navigate the college journey.
                    </p>

                    <!-- What you're signing up for -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 28px 0; background-color: #f0fdf9; border-radius: 12px; border-left: 4px solid #12756A;">
                      <tr>
                        <td style="padding: 24px;">
                          <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 600; color: #12756A;">
                            What you'll get with Sesame3:
                          </h2>
                          <table role="presentation" style="width: 100%; border-collapse: collapse;">
                            <tr>
                              <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                                <span style="color: #12756A; font-size: 18px;">✓</span>
                              </td>
                              <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: #374151;">
                                <strong>Expert Guidance</strong> — Get personalized advice from an AI trained on college admissions expertise
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                                <span style="color: #12756A; font-size: 18px;">✓</span>
                              </td>
                              <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: #374151;">
                                <strong>Honest Chance Assessments</strong> — Know where you stand with realistic evaluations
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                                <span style="color: #12756A; font-size: 18px;">✓</span>
                              </td>
                              <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: #374151;">
                                <strong>Clear Roadmap</strong> — Get a step-by-step plan tailored to your goals and timeline
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; vertical-align: top; width: 28px;">
                                <span style="color: #12756A; font-size: 18px;">✓</span>
                              </td>
                              <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: #374151;">
                                <strong>24/7 Availability</strong> — Your college counselor is always just a message away
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #374151;">
                      We're working hard to create the best college guidance experience, and we'll notify you as soon as Sesame3 is ready to help with your college journey.
                    </p>

                    <p style="margin: 0 0 28px; font-size: 16px; line-height: 1.6; color: #374151;">
                      In the meantime, keep an eye on your inbox — we'll send you updates on our progress and exclusive early-access opportunities.
                    </p>

                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td align="center">
                          <a href="https://sesame3.com" style="display: inline-block; padding: 14px 32px; background-color: #12756A; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 50px;">
                            Visit Sesame3 →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 20px; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 14px; color: #6b7280;">
                You received this email because you signed up for the Sesame3 waitlist.
              </p>
              <p style="margin: 0 0 12px; font-size: 14px; color: #9ca3af;">
                © ${new Date().getFullYear()} Sesame3. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                <a href="https://sesame3.com/terms" style="color: #6b7280; text-decoration: underline;">Terms of Service</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://sesame3.com/privacy" style="color: #6b7280; text-decoration: underline;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Plain text version of the email
function getWaitlistEmailText(): string {
  return `
You're on the Sesame3 waitlist! 🎉

Hi there,

We're thrilled that you're interested in Sesame3 — your personal AI college counselor. You've just secured your spot to be among the first to experience a smarter way to navigate the college journey.

What you'll get with Sesame3:

✓ Expert Guidance — Get personalized advice from an AI trained on college admissions expertise

✓ Honest Chance Assessments — Know where you stand with realistic evaluations

✓ Clear Roadmap — Get a step-by-step plan tailored to your goals and timeline

✓ 24/7 Availability — Your college counselor is always just a message away

We're working hard to create the best college guidance experience, and we'll notify you as soon as Sesame3 is ready to help with your college journey.

In the meantime, keep an eye on your inbox — we'll send you updates on our progress and exclusive early-access opportunities.

Visit us: https://sesame3.com

---
You received this email because you signed up for the Sesame3 waitlist.
© ${new Date().getFullYear()} Sesame3. All rights reserved.

Terms of Service: https://sesame3.com/terms
Privacy Policy: https://sesame3.com/privacy
  `.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Initialize Resend client
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send thank-you email via Resend
    const { error: resendError } = await resend.emails.send({
      from: "Sesame3 <hello@sesame3.com>",
      to: email,
      subject: "You're on the Sesame3 waitlist! 🎉",
      html: getWaitlistEmailHTML(email),
      text: getWaitlistEmailText(),
    });

    if (resendError) {
      console.error("Resend error:", resendError);
      return NextResponse.json(
        { error: "Failed to send confirmation email" },
        { status: 500 }
      );
    }

    // Also forward to Formspree to maintain existing data collection
    try {
      await fetch("https://formspree.io/f/mojazpwv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch (formspreeError) {
      // Log but don't fail if Formspree is unavailable
      console.error("Formspree error:", formspreeError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
