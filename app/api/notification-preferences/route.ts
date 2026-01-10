/**
 * GET/PUT /api/notification-preferences
 *
 * Manage user's notification preferences (free-form text).
 * These preferences are interpreted by the LLM notification engine.
 */

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/notification-preferences
 * Get the user's notification preferences
 */
export async function GET() {
  try {
    const authUser = await getCurrentUser();

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        notificationPreferences: true,
      },
    });

    return NextResponse.json({
      notificationPreferences: user?.notificationPreferences || "",
    });
  } catch (error) {
    console.error("[NotificationPreferences] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notification-preferences
 * Update the user's notification preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getCurrentUser();

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { notificationPreferences } = await request.json();

    // Validate - should be a string, can be empty
    if (notificationPreferences !== undefined && typeof notificationPreferences !== "string") {
      return NextResponse.json(
        { error: "Invalid preferences format" },
        { status: 400 }
      );
    }

    // Update the user's notification preferences
    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        notificationPreferences: notificationPreferences || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NotificationPreferences] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
