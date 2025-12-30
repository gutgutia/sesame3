// =============================================================================
// GLOBAL CONFIGURATION
// =============================================================================

/**
 * Centralized access to GlobalConfig settings.
 * Cached for performance with configurable TTL.
 */

import { prisma } from "@/lib/db";

// =============================================================================
// TYPES
// =============================================================================

export type FeatureFlags = {
  enableWidgets: boolean;
  enableChancesCalculation: boolean;
  enableStoryMode: boolean;
  enableSecretaryModel: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
};

// =============================================================================
// CACHE
// =============================================================================

let cachedFlags: FeatureFlags | null = null;
let flagsCachedAt: number = 0;
const FLAGS_CACHE_TTL = 60 * 1000; // 1 minute

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Get feature flags from GlobalConfig.
 * Cached for 1 minute to avoid excessive DB queries.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  const now = Date.now();
  
  if (cachedFlags && now - flagsCachedAt < FLAGS_CACHE_TTL) {
    return cachedFlags;
  }
  
  // Try to get from database
  let config = await prisma.globalConfig.findUnique({
    where: { id: "default" },
    select: {
      enableWidgets: true,
      enableChancesCalculation: true,
      enableStoryMode: true,
      enableSecretaryModel: true,
      maintenanceMode: true,
      maintenanceMessage: true,
    },
  });
  
  // Create default config if not exists
  if (!config) {
    config = await prisma.globalConfig.create({
      data: { id: "default" },
      select: {
        enableWidgets: true,
        enableChancesCalculation: true,
        enableStoryMode: true,
        enableSecretaryModel: true,
        maintenanceMode: true,
        maintenanceMessage: true,
      },
    });
  }

  cachedFlags = {
    enableWidgets: config.enableWidgets,
    enableChancesCalculation: config.enableChancesCalculation,
    enableStoryMode: config.enableStoryMode,
    enableSecretaryModel: config.enableSecretaryModel,
    maintenanceMode: config.maintenanceMode,
    maintenanceMessage: config.maintenanceMessage,
  };
  
  flagsCachedAt = now;
  return cachedFlags;
}

/**
 * Invalidate feature flags cache.
 * Call after admin updates GlobalConfig.
 */
export function invalidateFeatureFlagsCache(): void {
  cachedFlags = null;
  flagsCachedAt = 0;
}

/**
 * Check if app is in maintenance mode.
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags.maintenanceMode;
}

/**
 * Get maintenance message if in maintenance mode.
 */
export async function getMaintenanceMessage(): Promise<string | null> {
  const flags = await getFeatureFlags();
  if (flags.maintenanceMode) {
    return flags.maintenanceMessage || "We're currently performing maintenance. Please try again later.";
  }
  return null;
}

