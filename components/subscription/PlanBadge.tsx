"use client";

/**
 * PlanBadge - Shows current plan and upgrade link in sidebar
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Zap, Sparkles, Crown, ArrowRight, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PLANS, TIER_LEVELS, type SubscriptionTier } from "@/lib/subscription/plans";

// =============================================================================
// PLAN SELECTOR MODAL
// =============================================================================

function PlanSelectorModal({
  isOpen,
  currentTier,
  onClose,
}: {
  isOpen: boolean;
  currentTier: SubscriptionTier;
  onClose: () => void;
}) {
  const [isYearly, setIsYearly] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const currentLevel = TIER_LEVELS[currentTier];

  const handleSelect = async (planId: SubscriptionTier) => {
    if (planId === "free" || planId === currentTier) return;

    setActionLoading(planId);

    try {
      // Pass current URL for redirect after checkout
      const currentUrl = window.location.pathname;

      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade",
          plan: planId,
          yearly: isYearly,
          returnUrl: currentUrl,
        }),
      });

      const data = await res.json();

      if (res.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else if (res.ok && data.immediate) {
        onClose();
        window.location.reload();
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl max-w-3xl w-full p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Upgrade Your Plan
        </h2>
        <p className="text-text-secondary mb-6">
          Get smarter advice with more powerful AI models
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={cn("text-sm font-medium", !isYearly ? "text-text-primary" : "text-text-muted")}>
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
          <span className={cn("text-sm font-medium", isYearly ? "text-text-primary" : "text-text-muted")}>
            Yearly
          </span>
          <span className="text-xs text-accent-primary font-medium bg-accent-surface px-2 py-0.5 rounded-full">
            Save 17%
          </span>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentTier === plan.id;
            const planLevel = TIER_LEVELS[plan.id];
            const isUpgrade = planLevel > currentLevel;
            const price = isYearly ? plan.priceYearly : plan.price;
            const Icon = plan.icon;

            return (
              <div
                key={plan.id}
                className={cn(
                  "relative bg-surface-secondary border rounded-2xl p-5 transition-all flex flex-col",
                  plan.popular && !isCurrentPlan
                    ? "border-accent-primary shadow-lg"
                    : "border-border-subtle",
                  isCurrentPlan && "ring-2 ring-accent-primary ring-offset-2"
                )}
              >
                {plan.popular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-accent-primary text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}

                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", plan.bgColor)}>
                  <Icon className={cn("w-4 h-4", plan.color)} />
                </div>

                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  {plan.name}
                </h3>

                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl font-bold text-text-primary">
                    ${price}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-text-muted text-sm">
                      /{isYearly ? "year" : "month"}
                    </span>
                  )}
                </div>

                <p className="text-sm text-text-muted mb-4 line-clamp-2">
                  {plan.description}
                </p>

                {/* Flex-grow to push button to bottom */}
                <div className="flex-1">
                  <ul className="space-y-1.5 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className={cn("w-4 h-4 mt-0.5 shrink-0", plan.color)} />
                        <span className="text-text-secondary">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Button always at bottom */}
                <div className="mt-auto pt-2">
                  {isCurrentPlan ? (
                    <Button variant="secondary" className="w-full" disabled size="sm">
                      Current Plan
                    </Button>
                  ) : plan.id === "free" ? (
                    <Button variant="secondary" className="w-full" size="sm" disabled>
                      Free tier
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="sm"
                      variant={isUpgrade ? "primary" : "secondary"}
                      onClick={() => handleSelect(plan.id)}
                      disabled={actionLoading === plan.id}
                    >
                      {actionLoading === plan.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Upgrade <ArrowRight className="w-3 h-3 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Use portal to render outside sidebar's stacking context
  return createPortal(modalContent, document.body);
}

// =============================================================================
// PLAN BADGE (for sidebar)
// =============================================================================

export function PlanBadge() {
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>("free");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Fetch current subscription
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setCurrentTier(data.subscription?.tier || "free");
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  const currentPlan = PLANS.find(p => p.id === currentTier) || PLANS[0];
  const Icon = currentPlan.icon;

  if (isLoading) {
    return (
      <div className="px-1 mb-2">
        <div className="h-16 bg-surface-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  // Render based on tier
  const renderBadgeContent = () => {
    switch (currentTier) {
      case "free":
        return (
          <div className="bg-white/60 border border-border-subtle rounded-xl p-3 hover:border-accent-primary/30 transition-colors cursor-pointer" onClick={() => setShowModal(true)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100">
                <Zap className="w-3.5 h-3.5 text-gray-500" />
              </div>
              <span className="text-sm font-medium text-text-primary">Free Plan</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1.5 bg-accent-surface/60 rounded-lg">
              <Sparkles className="w-3 h-3 text-accent-primary" />
              <span className="text-xs text-accent-primary font-medium">
                Upgrade for smarter advice
              </span>
              <ArrowRight className="w-3 h-3 text-accent-primary" />
            </div>
          </div>
        );

      case "standard":
        return (
          <div className="bg-white/60 border border-accent-primary/20 rounded-xl p-3 hover:border-accent-primary/40 transition-colors cursor-pointer" onClick={() => setShowModal(true)}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-accent-surface">
                <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
              </div>
              <span className="text-sm font-medium text-text-primary">Standard Plan</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 py-1.5 bg-yellow-50 rounded-lg">
              <Crown className="w-3 h-3 text-yellow-600" />
              <span className="text-xs text-yellow-700 font-medium">
                Go Premium for best advice
              </span>
              <ArrowRight className="w-3 h-3 text-yellow-600" />
            </div>
          </div>
        );

      case "premium":
        return (
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200/60 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center bg-yellow-100">
                <Crown className="w-3.5 h-3.5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-text-primary">Premium Plan</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Check className="w-3 h-3 text-yellow-600" />
                  <span className="text-xs text-yellow-700">Best AI counselor</span>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      <div className="px-1 mb-2">
        {renderBadgeContent()}
      </div>

      <PlanSelectorModal
        isOpen={showModal}
        currentTier={currentTier}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
