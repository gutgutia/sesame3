/**
 * Shared pricing/plan data for subscription components
 *
 * Two-tier pricing model:
 * - Free: Limited messages, 3 schools for chances, no personalized recommendations
 * - Paid ($25/mo or $250/year): Unlimited messages, full access to all features
 */

import { Zap, Crown, LucideIcon } from "lucide-react";

export type SubscriptionTier = "free" | "paid";

export type Plan = {
  id: SubscriptionTier;
  name: string;
  price: number;
  priceYearly: number;
  description: string;
  features: string[];
  limitations?: string[];
  icon: LucideIcon;
  color: string;
  bgColor: string;
  popular?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceYearly: 0,
    description: "Get started with AI-powered college counseling",
    features: [
      "AI-powered guidance (20 messages/day)",
      "Unlimited profile building",
      "School list tracking",
      "Goal & task management",
      "Check chances for 3 schools",
    ],
    limitations: [
      "20 messages per day",
      "Chances for 3 schools only",
      "No personalized recommendations",
    ],
    icon: Zap,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  {
    id: "paid",
    name: "Premium",
    price: 25,
    priceYearly: 250,
    description: "The full college counseling experience",
    features: [
      "Our smartest AI counselor (Opus)",
      "Unlimited conversations",
      "Unlimited chances calculations",
      "Personalized school & program recommendations",
      "Expert-level reasoning & strategy",
      "Priority support",
    ],
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    popular: true,
  },
];

// Feature limits for free tier
export const FREE_TIER_LIMITS = {
  messagesPerDay: 20,
  schoolsWithChances: 3,
  hasRecommendations: false,
} as const;

// For checking if a tier has access to a feature
export function hasFeatureAccess(tier: SubscriptionTier, feature: "recommendations" | "unlimited_chances" | "unlimited_messages"): boolean {
  if (tier === "paid") return true;
  return false;
}

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  paid: 1,
};

export function getPlan(tier: SubscriptionTier): Plan {
  return PLANS.find(p => p.id === tier) || PLANS[0];
}

export function isPaidTier(tier: SubscriptionTier): boolean {
  return tier === "paid";
}
