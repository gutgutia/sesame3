"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  User, 
  CreditCard, 
  Sparkles,
  Check,
  Crown,
  Zap,
  ArrowRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";

// =============================================================================
// TYPES
// =============================================================================

type SubscriptionTier = "free" | "standard" | "premium";

type UserSettings = {
  email: string;
  subscriptionTier: SubscriptionTier;
  subscriptionEndsAt: string | null;
};

type UsageData = {
  dailyCost: number;
  dailyLimit: number;
  weeklyCost: number;
  weeklyLimit: number;
  messageCount: number;
  messageLimit: number;
};

// =============================================================================
// PRICING DATA
// =============================================================================

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: 0,
    priceYearly: 0,
    description: "Get started with AI-powered college counseling",
    features: [
      "20 messages per day",
      "Basic advisor (Haiku)",
      "Profile building",
      "School list management",
      "Goal tracking",
    ],
    icon: Zap,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  {
    id: "standard" as const,
    name: "Standard",
    price: 9.99,
    priceYearly: 99,
    description: "Deep, personalized guidance for serious students",
    features: [
      "100 messages per day",
      "Advanced advisor (Sonnet)",
      "Detailed chances analysis",
      "Priority support",
      "Everything in Free",
    ],
    icon: Sparkles,
    color: "text-accent-primary",
    bgColor: "bg-accent-surface",
    popular: true,
  },
  {
    id: "premium" as const,
    name: "Premium",
    price: 24.99,
    priceYearly: 249,
    description: "The most powerful AI counselor available",
    features: [
      "500 messages per day",
      "Expert advisor (Opus)",
      "Comprehensive strategy sessions",
      "Essay feedback (coming soon)",
      "Everything in Standard",
    ],
    icon: Crown,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
  },
];

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SettingsPage() {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<"profile" | "subscription">("subscription");
  const [isYearly, setIsYearly] = useState(true);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<string | null>(null);

  // Load user settings and usage
  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, usageRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/usage"),
        ]);
        
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);
        }
        
        if (usageRes.ok) {
          const data = await usageRes.json();
          setUsage(data);
        }
      } catch (error) {
        console.error("Failed to load settings:", error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  // Handle upgrade/checkout
  const handleCheckout = async (planId: SubscriptionTier, yearly: boolean) => {
    if (planId === "free") return;
    
    setIsCheckoutLoading(planId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, yearly }),
      });
      
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const error = await res.json();
        alert(error.message || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout");
    } finally {
      setIsCheckoutLoading(null);
    }
  };

  // Handle manage subscription
  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error("Portal error:", error);
    }
  };

  const currentPlan = settings?.subscriptionTier || "free";

  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      {/* Header */}
      <div className="border-b border-border-subtle bg-surface-secondary/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Settings
            </h1>
          </div>
          <p className="text-text-secondary">
            Manage your account and subscription
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-surface-secondary rounded-xl mb-8 w-fit">
          <button
            onClick={() => setActiveTab("subscription")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "subscription"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Subscription
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "profile"
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-primary"
            )}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Subscription Tab */}
            {activeTab === "subscription" && (
              <div className="space-y-8">
                {/* Current Plan & Usage */}
                <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-4">
                    Current Plan
                  </h2>
                  
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-text-primary capitalize">
                          {currentPlan}
                        </span>
                        {currentPlan !== "free" && (
                          <span className="px-2 py-0.5 bg-accent-primary/10 text-accent-primary text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      {settings?.subscriptionEndsAt && (
                        <p className="text-sm text-text-muted mt-1">
                          Next billing: {new Date(settings.subscriptionEndsAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    {currentPlan !== "free" && (
                      <Button variant="secondary" size="sm" onClick={handleManageSubscription}>
                        Manage Subscription
                        <ExternalLink className="w-4 h-4 ml-1" />
                      </Button>
                    )}
                  </div>

                  {/* Usage Stats */}
                  {usage && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-primary rounded-xl p-4">
                        <div className="text-sm text-text-muted mb-1">Messages Today</div>
                        <div className="text-xl font-semibold text-text-primary">
                          {usage.messageCount} / {usage.messageLimit}
                        </div>
                        <div className="mt-2 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent-primary rounded-full"
                            style={{ width: `${Math.min(100, (usage.messageCount / usage.messageLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="bg-surface-primary rounded-xl p-4">
                        <div className="text-sm text-text-muted mb-1">Daily Cost</div>
                        <div className="text-xl font-semibold text-text-primary">
                          ${usage.dailyCost.toFixed(2)} / ${usage.dailyLimit.toFixed(2)}
                        </div>
                        <div className="mt-2 h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent-primary rounded-full"
                            style={{ width: `${Math.min(100, (usage.dailyCost / usage.dailyLimit) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pricing Toggle */}
                <div className="flex items-center justify-center gap-3">
                  <span className={cn("text-sm font-medium", !isYearly && "text-text-primary")}>
                    Monthly
                  </span>
                  <button
                    onClick={() => setIsYearly(!isYearly)}
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors",
                      isYearly ? "bg-accent-primary" : "bg-gray-300"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                        isYearly ? "translate-x-7" : "translate-x-1"
                      )}
                    />
                  </button>
                  <span className={cn("text-sm font-medium", isYearly && "text-text-primary")}>
                    Yearly
                  </span>
                  <span className="text-xs text-accent-primary font-medium bg-accent-surface px-2 py-0.5 rounded-full">
                    Save 17%
                  </span>
                </div>

                {/* Pricing Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PLANS.map((plan) => {
                    const isCurrentPlan = currentPlan === plan.id;
                    const price = isYearly ? plan.priceYearly : plan.price;
                    const Icon = plan.icon;
                    
                    return (
                      <div
                        key={plan.id}
                        className={cn(
                          "relative bg-surface-secondary border rounded-2xl p-6 transition-all",
                          plan.popular 
                            ? "border-accent-primary shadow-lg scale-[1.02]" 
                            : "border-border-subtle",
                          isCurrentPlan && "ring-2 ring-accent-primary"
                        )}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-primary text-white text-xs font-medium rounded-full">
                            Most Popular
                          </div>
                        )}
                        
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", plan.bgColor)}>
                          <Icon className={cn("w-5 h-5", plan.color)} />
                        </div>
                        
                        <h3 className="text-lg font-semibold text-text-primary mb-1">
                          {plan.name}
                        </h3>
                        
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-3xl font-bold text-text-primary">
                            ${price}
                          </span>
                          {plan.price > 0 && (
                            <span className="text-text-muted text-sm">
                              /{isYearly ? "year" : "month"}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-text-muted mb-4">
                          {plan.description}
                        </p>
                        
                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Check className={cn("w-4 h-4 mt-0.5 shrink-0", plan.color)} />
                              <span className="text-text-secondary">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {isCurrentPlan ? (
                          <Button variant="secondary" className="w-full" disabled>
                            Current Plan
                          </Button>
                        ) : plan.id === "free" ? (
                          <Button variant="secondary" className="w-full" disabled>
                            Free Forever
                          </Button>
                        ) : (
                          <Button 
                            className="w-full"
                            onClick={() => handleCheckout(plan.id, isYearly)}
                            disabled={isCheckoutLoading === plan.id}
                          >
                            {isCheckoutLoading === plan.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                Upgrade
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                  <h2 className="text-lg font-semibold text-text-primary mb-6">
                    Your Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Name
                      </label>
                      <div className="text-text-primary">
                        {profile?.firstName} {profile?.lastName}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Email
                      </label>
                      <div className="text-text-primary">
                        {settings?.email || "Not available"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        Grade
                      </label>
                      <div className="text-text-primary">
                        {profile?.grade || "Not set"}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-muted mb-1">
                        High School
                      </label>
                      <div className="text-text-primary">
                        {profile?.highSchoolName || "Not set"}
                        {profile?.highSchoolCity && profile?.highSchoolState && (
                          <span className="text-text-muted">
                            {" "}• {profile.highSchoolCity}, {profile.highSchoolState}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-border-subtle">
                    <p className="text-sm text-text-muted">
                      To update your profile information, go to the{" "}
                      <a href="/profile" className="text-accent-primary hover:underline">
                        Profile page
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

