/**
 * GET/POST /api/admin/enable-widgets
 *
 * Enables the widgets feature flag. Just navigate to this URL.
 * TODO: Remove after widgets are working properly.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { invalidateFeatureFlagsCache } from "@/lib/config";

async function enableWidgets() {
  let globalConfig = await prisma.globalConfig.findUnique({
    where: { id: "default" },
  });

  if (!globalConfig) {
    globalConfig = await prisma.globalConfig.create({
      data: { id: "default" },
    });
  } else {
    globalConfig = await prisma.globalConfig.update({
      where: { id: "default" },
      data: { enableWidgets: true },
    });
  }

  // Clear the cache so changes take effect immediately
  invalidateFeatureFlagsCache();

  return globalConfig;
}

export async function GET() {
  try {
    const globalConfig = await enableWidgets();

    return NextResponse.json({
      success: true,
      message: "Widgets enabled! Refresh the chat page to test.",
      featureFlags: {
        enableWidgets: globalConfig.enableWidgets,
        enableChancesCalculation: globalConfig.enableChancesCalculation,
        enableStoryMode: globalConfig.enableStoryMode,
        maintenanceMode: globalConfig.maintenanceMode,
      },
    });
  } catch (error) {
    console.error("[Admin] Error enabling widgets:", error);
    return NextResponse.json(
      { error: "Failed to enable widgets" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
