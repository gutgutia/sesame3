import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id]
 * Get user details with profile and usage history
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: {
          include: {
            aboutMe: true,
            academics: true,
            testing: {
              include: {
                satScores: true,
                actScores: true,
              },
            },
          },
        },
        usageRecords: {
          orderBy: { date: "desc" },
          take: 30, // Last 30 days
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate usage stats
    const totalUsage = user.usageRecords.reduce(
      (acc, r) => ({
        messageCount: acc.messageCount + r.messageCount,
        costTotal: acc.costTotal + r.costTotal,
      }),
      { messageCount: 0, costTotal: 0 }
    );

    return NextResponse.json({
      ...user,
      usageStats: {
        last30Days: totalUsage,
        recordCount: user.usageRecords.length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user subscription and override settings
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    // Validate user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build update data - only update fields that are explicitly provided
    const updateData: Record<string, unknown> = {};

    // Subscription tier
    if (body.subscriptionTier !== undefined) {
      if (!["free", "paid"].includes(body.subscriptionTier)) {
        return NextResponse.json(
          { error: "Invalid subscription tier. Must be 'free' or 'paid'" },
          { status: 400 }
        );
      }
      updateData.subscriptionTier = body.subscriptionTier;
    }

    // Subscription expiration (for time-limited premium access)
    if (body.subscriptionEndsAt !== undefined) {
      updateData.subscriptionEndsAt = body.subscriptionEndsAt
        ? new Date(body.subscriptionEndsAt)
        : null;
    }

    // Admin overrides
    if (body.overrideMessageLimit !== undefined) {
      updateData.overrideMessageLimit =
        body.overrideMessageLimit === null ||
        body.overrideMessageLimit === ""
          ? null
          : parseInt(body.overrideMessageLimit);
    }

    if (body.overrideDailyCostLimit !== undefined) {
      updateData.overrideDailyCostLimit =
        body.overrideDailyCostLimit === null ||
        body.overrideDailyCostLimit === ""
          ? null
          : parseFloat(body.overrideDailyCostLimit);
    }

    if (body.overrideWeeklyCostLimit !== undefined) {
      updateData.overrideWeeklyCostLimit =
        body.overrideWeeklyCostLimit === null ||
        body.overrideWeeklyCostLimit === ""
          ? null
          : parseFloat(body.overrideWeeklyCostLimit);
    }

    // Admin status
    if (body.isAdmin !== undefined) {
      updateData.isAdmin = Boolean(body.isAdmin);
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        subscriptionTier: true,
        subscriptionEndsAt: true,
        overrideMessageLimit: true,
        overrideDailyCostLimit: true,
        overrideWeeklyCostLimit: true,
        isAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        studentProfile: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            graduationYear: true,
          },
        },
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Users] Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
