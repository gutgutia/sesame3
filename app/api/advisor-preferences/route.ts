import { NextRequest, NextResponse } from "next/server";
import { getCurrentProfileId } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/advisor-preferences
 * Get the student's advisor preferences
 */
export async function GET() {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const context = await prisma.studentContext.findUnique({
      where: { studentProfileId: profileId },
      select: {
        advisorPreferences: true,
        accountabilityLevel: true,
      },
    });

    return NextResponse.json({
      advisorPreferences: context?.advisorPreferences || "",
      accountabilityLevel: context?.accountabilityLevel || "moderate",
    });
  } catch (error) {
    console.error("[AdvisorPreferences] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load preferences" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/advisor-preferences
 * Update the student's advisor preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { advisorPreferences, accountabilityLevel } = await request.json();

    // Validate accountability level
    const validLevels = ["light", "moderate", "high"];
    if (accountabilityLevel && !validLevels.includes(accountabilityLevel)) {
      return NextResponse.json(
        { error: "Invalid accountability level" },
        { status: 400 }
      );
    }

    // Upsert the preferences
    await prisma.studentContext.upsert({
      where: { studentProfileId: profileId },
      update: {
        advisorPreferences: advisorPreferences || null,
        accountabilityLevel: accountabilityLevel || "moderate",
      },
      create: {
        studentProfileId: profileId,
        advisorPreferences: advisorPreferences || null,
        accountabilityLevel: accountabilityLevel || "moderate",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdvisorPreferences] PUT error:", error);
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 }
    );
  }
}
