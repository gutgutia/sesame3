// =============================================================================
// USAGE TRACKING SERVICE
// =============================================================================

/**
 * Tracks AI usage per user for billing and rate limiting.
 *
 * Key concepts:
 * - Two-tier system: free and paid
 * - Free tier: 20 messages/day, cost limits to prevent abuse
 * - Paid tier: Unlimited messages (with high abuse-prevention cap)
 * - Usage is tracked per day in UsageRecord
 * - Admin can override limits per user
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export type SubscriptionTier = "free" | "paid";

export type ModelType = 
  | "haiku" 
  | "sonnet" 
  | "opus" 
  | "kimi_k2";

export type UsageCheck = {
  allowed: boolean;
  reason?: string;
  usage: {
    dailyCost: number;
    dailyLimit: number;
    weeklyCost: number;
    weeklyLimit: number;
    messageCount: number;
    messageLimit: number;
  };
  resetTime?: Date;
};

export type UsageRecordInput = {
  userId: string;
  model: ModelType;
  tokensInput: number;
  tokensOutput: number;
  messageCount?: number;
};

// =============================================================================
// COST CALCULATION
// =============================================================================

/**
 * Model costs per 1M tokens (defaults, can be overridden in GlobalConfig)
 */
const DEFAULT_COSTS: Record<ModelType, { input: number; output: number }> = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.00, output: 15.00 },
  opus: { input: 15.00, output: 75.00 },
  kimi_k2: { input: 0.15, output: 0.40 },
};

/**
 * Calculate cost for a model usage.
 */
export function calculateCost(
  model: ModelType,
  tokensInput: number,
  tokensOutput: number,
  costs = DEFAULT_COSTS
): number {
  const modelCosts = costs[model];
  const inputCost = (tokensInput / 1_000_000) * modelCosts.input;
  const outputCost = (tokensOutput / 1_000_000) * modelCosts.output;
  return inputCost + outputCost;
}

// =============================================================================
// USAGE RECORDING
// =============================================================================

/**
 * Record usage for a user.
 * Creates or updates the daily usage record.
 */
export async function recordUsage(input: UsageRecordInput): Promise<void> {
  const { userId, model, tokensInput, tokensOutput, messageCount = 1 } = input;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const cost = calculateCost(model, tokensInput, tokensOutput);
  
  // Determine which cost bucket to update
  const costField = model === "kimi_k2" ? "costParser" : "costAdvisor";
  
  // Upsert the daily record
  await prisma.usageRecord.upsert({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
    update: {
      messageCount: { increment: messageCount },
      tokensInput: { increment: tokensInput },
      tokensOutput: { increment: tokensOutput },
      [costField]: { increment: cost },
      costTotal: { increment: cost },
      // Update model usage breakdown
      modelUsage: {
        // This will be handled with a raw update for JSON merge
      },
    },
    create: {
      userId,
      date: today,
      messageCount,
      tokensInput,
      tokensOutput,
      [costField]: cost,
      costTotal: cost,
      modelUsage: {
        [model]: { tokens: tokensInput + tokensOutput, cost },
      },
    },
  });
}

// =============================================================================
// USAGE CHECKING
// =============================================================================

/**
 * Check if a user can send a message based on their usage limits.
 */
export async function checkUsage(userId: string): Promise<UsageCheck> {
  // Get user with their tier and overrides
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      overrideDailyCostLimit: true,
      overrideWeeklyCostLimit: true,
      overrideMessageLimit: true,
    },
  });
  
  if (!user) {
    return {
      allowed: false,
      reason: "User not found",
      usage: {
        dailyCost: 0,
        dailyLimit: 0,
        weeklyCost: 0,
        weeklyLimit: 0,
        messageCount: 0,
        messageLimit: 0,
      },
    };
  }
  
  // Get global config for tier limits
  const config = await getGlobalConfig();
  const tier = user.subscriptionTier as SubscriptionTier;
  
  // Get limits (user override takes precedence)
  const dailyLimit = user.overrideDailyCostLimit ?? getTierLimit(config, tier, "daily");
  const weeklyLimit = user.overrideWeeklyCostLimit ?? getTierLimit(config, tier, "weekly");
  const messageLimit = user.overrideMessageLimit ?? getTierLimit(config, tier, "messages");
  
  // Get current usage
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Daily usage
  const dailyRecord = await prisma.usageRecord.findUnique({
    where: {
      userId_date: {
        userId,
        date: today,
      },
    },
  });
  
  const dailyCost = dailyRecord?.costTotal ?? 0;
  const messageCount = dailyRecord?.messageCount ?? 0;
  
  // Weekly usage (last 7 days)
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const weeklyRecords = await prisma.usageRecord.findMany({
    where: {
      userId,
      date: { gte: weekAgo },
    },
    select: { costTotal: true },
  });
  
  const weeklyCost = weeklyRecords.reduce((sum, r) => sum + r.costTotal, 0);
  
  // Check limits
  const usage = {
    dailyCost,
    dailyLimit,
    weeklyCost,
    weeklyLimit,
    messageCount,
    messageLimit,
  };
  
  // Check message limit
  if (messageCount >= messageLimit) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      allowed: false,
      reason: `You've reached your daily message limit (${messageLimit} messages). Resets at midnight.`,
      usage,
      resetTime: tomorrow,
    };
  }
  
  // Check daily cost limit
  if (dailyCost >= dailyLimit) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return {
      allowed: false,
      reason: "You've reached your daily usage limit. Upgrade your plan or wait until tomorrow.",
      usage,
      resetTime: tomorrow,
    };
  }
  
  // Check weekly cost limit
  if (weeklyCost >= weeklyLimit) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    return {
      allowed: false,
      reason: "You've reached your weekly usage limit. Upgrade your plan for more messages.",
      usage,
      resetTime: nextWeek,
    };
  }
  
  return { allowed: true, usage };
}

// =============================================================================
// TIER HELPERS
// =============================================================================

type GlobalConfigData = {
  freeDailyCostLimit: number;
  freeWeeklyCostLimit: number;
  freeMessageLimit: number;
  paidDailyCostLimit: number;
  paidWeeklyCostLimit: number;
  paidMessageLimit: number;
};

function getTierLimit(
  config: GlobalConfigData,
  tier: SubscriptionTier,
  limitType: "daily" | "weekly" | "messages"
): number {
  const key = `${tier}${limitType === "daily" ? "DailyCostLimit" : limitType === "weekly" ? "WeeklyCostLimit" : "MessageLimit"}` as keyof GlobalConfigData;
  return config[key];
}

/**
 * Get the advisor model for a user's tier.
 */
export function getAdvisorModelForTier(tier: SubscriptionTier): ModelType {
  if (tier === "paid") {
    return "opus";
  }
  return "kimi_k2";
}

// =============================================================================
// GLOBAL CONFIG
// =============================================================================

let cachedConfig: GlobalConfigData | null = null;
let configCachedAt: number = 0;
const CONFIG_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get global config (cached for 1 minute).
 */
async function getGlobalConfig(): Promise<GlobalConfigData> {
  const now = Date.now();
  
  if (cachedConfig && now - configCachedAt < CONFIG_CACHE_TTL) {
    return cachedConfig;
  }
  
  // Try to get from database
  let config = await prisma.globalConfig.findUnique({
    where: { id: "default" },
  });
  
  // Create default config if not exists
  if (!config) {
    config = await prisma.globalConfig.create({
      data: { id: "default" },
    });
  }
  
  cachedConfig = {
    freeDailyCostLimit: config.freeDailyCostLimit,
    freeWeeklyCostLimit: config.freeWeeklyCostLimit,
    freeMessageLimit: config.freeMessageLimit,
    paidDailyCostLimit: config.paidDailyCostLimit,
    paidWeeklyCostLimit: config.paidWeeklyCostLimit,
    paidMessageLimit: config.paidMessageLimit,
  };
  
  configCachedAt = now;
  return cachedConfig;
}

/**
 * Invalidate config cache (call after admin updates).
 */
export function invalidateConfigCache(): void {
  cachedConfig = null;
  configCachedAt = 0;
}

// =============================================================================
// USER HELPERS
// =============================================================================

/**
 * Get user's subscription tier.
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  
  return (user?.subscriptionTier as SubscriptionTier) || "free";
}

/**
 * Get user tier from profile ID.
 */
export async function getUserTierFromProfile(profileId: string): Promise<SubscriptionTier> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: { user: { select: { subscriptionTier: true } } },
  });
  
  return (profile?.user.subscriptionTier as SubscriptionTier) || "free";
}

/**
 * Get user ID from profile ID.
 */
export async function getUserIdFromProfile(profileId: string): Promise<string | null> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });
  
  return profile?.userId ?? null;
}

