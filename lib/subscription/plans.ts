/**
 * Shared pricing/plan data for subscription components
 */

import { Zap, Sparkles, Crown, LucideIcon } from "lucide-react";

export type SubscriptionTier = "free" | "standard" | "premium";

export type Plan = {
  id: SubscriptionTier;
  name: string;
  price: number;
  priceYearly: number;
  description: string;
  features: string[];
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
      "AI-powered guidance",
      "Daily conversation limit",
      "Profile building tools",
      "School list tracking",
      "Goal & task management",
    ],
    icon: Zap,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  {
    id: "standard",
    name: "Standard",
    price: 9.99,
    priceYearly: 99,
    description: "Smarter advice for serious students",
    features: [
      "Smarter, deeper advice",
      "Generous message allowance",
      "Enhanced reasoning",
      "Priority support",
      "All Free features",
    ],
    icon: Sparkles,
    color: "text-accent-primary",
    bgColor: "bg-accent-surface",
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 24.99,
    priceYearly: 249,
    description: "The most powerful AI counselor",
    features: [
      "Our best AI counselor",
      "Unlimited conversations",
      "Expert-level reasoning",
      "Personalized strategy",
      "All Standard features",
    ],
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
];

export const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  standard: 1,
  premium: 2,
};

export function getPlan(tier: SubscriptionTier): Plan {
  return PLANS.find(p => p.id === tier) || PLANS[0];
}
