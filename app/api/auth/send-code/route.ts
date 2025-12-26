/**
 * POST /api/auth/send-code
 *
 * Sends a verification code to the user's email.
 * Creates a new OTP in the database and sends it via Resend.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail, generateOTP, getOTPExpiry } from "@/lib/email/resend";
import { VerificationCodeEmail } from "@/lib/email/templates";

// Rate limiting: max 5 requests per email per 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Simple email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Rate limiting: check recent codes for this email
    const recentCodes = await prisma.authCode.count({
      where: {
        email: normalizedEmail,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_WINDOW),
        },
      },
    });

    if (recentCodes >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check if user exists (to determine if this is signup or login)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    const isNewUser = !existingUser;

    // Invalidate any existing unused codes for this email
    await prisma.authCode.updateMany({
      where: {
        email: normalizedEmail,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Generate new OTP
    const code = generateOTP();
    const expiresAt = getOTPExpiry();

    // Store in database
    await prisma.authCode.create({
      data: {
        email: normalizedEmail,
        code,
        type: isNewUser ? "signup" : "login",
        expiresAt,
      },
    });

    // Send email
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: "Your Sesame3 verification code",
      react: VerificationCodeEmail({
        code,
        email: normalizedEmail,
      }),
      text: `Your Sesame3 verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    });

    if (!emailResult.success) {
      // In development, still return success but log the issue
      console.error("[Auth] Email send failed:", emailResult.error);

      // For development, return the code (remove in production!)
      if (process.env.NODE_ENV === "development") {
        console.log(`[Auth] DEV MODE - Code for ${normalizedEmail}: ${code}`);
        return NextResponse.json({
          success: true,
          isNewUser,
          message: "Verification code sent",
          // DEV ONLY - remove in production
          devCode: code,
        });
      }
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      message: "Verification code sent",
    });
  } catch (error) {
    console.error("[Auth] Error sending code:", error);
    return NextResponse.json(
      { error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
