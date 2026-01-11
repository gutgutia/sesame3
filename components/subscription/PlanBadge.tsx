"use client";

/**
 * PlanBadge - Shows current plan and upgrade link in sidebar
 *
 * Two-tier system:
 * - Free: Shows upgrade prompt
 * - Paid: Shows premium badge
 *
 * NOTE: This component is hidden in native mobile apps (iOS/Android)
 * to avoid Apple's 30% commission on in-app purchases.
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Zap, Crown, ArrowRight, X, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { PLANS, type SubscriptionTier } from "@/lib/subscription/plans";
import { useShowUpgradeUI } from "@/lib/context/PlatformContext";

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
  const [actionLoading, setActionLoading] = useState(false);
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

  const handleUpgrade = async () => {
    setActionLoading(true);

    try {
      // Pass current URL for redirect after checkout
      const currentUrl = window.location.pathname;

      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upgrade",
          plan: "paid",
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
      setActionLoading(false);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const paidPlan = PLANS.find((p) => p.id === "paid")!;
  const freePlan = PLANS.find((p) => p.id === "free")!;
  const price = isYearly ? paidPlan.priceYearly : paidPlan.price;
  const monthlyEquivalent = isYearly ? Math.round(paidPlan.priceYearly / 12) : paidPlan.price;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">
            Upgrade to Premium
          </h2>
          <p className="text-text-secondary">
            Get the full college counseling experience
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span
            className={cn(
              "text-sm font-medium",
              !isYearly ? "text-text-primary" : "text-text-muted"
            )}
          >
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
          <span
            className={cn(
              "text-sm font-medium",
              isYearly ? "text-text-primary" : "text-text-muted"
            )}
          >
            Yearly
          </span>
          {isYearly && (
            <span className="text-xs text-accent-primary font-medium bg-accent-surface px-2 py-0.5 rounded-full">
              Save 17%
            </span>
          )}
        </div>

        {/* Pricing */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-text-primary">
              ${price}
            </span>
            <span className="text-text-muted">/{isYearly ? "year" : "month"}</span>
          </div>
          {isYearly && (
            <p className="text-sm text-text-muted mt-1">
              That&apos;s just ~${monthlyEquivalent}/month
            </p>
          )}
        </div>

        {/* Features Comparison */}
        <div className="bg-surface-secondary rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-text-primary mb-3">
            What you&apos;ll get:
          </h3>
          <ul className="space-y-2">
            {paidPlan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 mt-0.5 shrink-0 text-yellow-600" />
                <span className="text-text-secondary">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Current Plan Note */}
        {currentTier === "free" && (
          <div className="bg-gray-50 rounded-lg p-3 mb-6 text-sm">
            <p className="text-text-muted">
              <span className="font-medium">Current plan:</span> Free — {freePlan.limitations?.join(", ")}
            </p>
          </div>
        )}

        {/* CTA */}
        <Button
          className="w-full"
          onClick={handleUpgrade}
          disabled={actionLoading || currentTier === "paid"}
        >
          {actionLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : currentTier === "paid" ? (
            "You're already on Premium"
          ) : (
            <>
              Upgrade Now
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
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
  const showUpgradeUI = useShowUpgradeUI();

  // Fetch current subscription
  useEffect(() => {
    async function fetchSubscription() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          // Handle legacy tier names
          const tier = data.subscription?.tier || "free";
          setCurrentTier(tier === "standard" || tier === "premium" ? "paid" : tier);
        }
      } catch (err) {
        console.error("Failed to fetch subscription:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSubscription();
  }, []);

  // Hide entire component in native apps to avoid Apple's 30% cut
  if (!showUpgradeUI) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="px-1 mb-2">
        <div className="h-16 bg-surface-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  // Render based on tier
  const renderBadgeContent = () => {
    if (currentTier === "paid") {
      return (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200/60 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center bg-yellow-100">
              <Crown className="w-3.5 h-3.5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-text-primary">Premium</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Check className="w-3 h-3 text-yellow-600" />
                <span className="text-xs text-yellow-700">Full access</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Free tier
    return (
      <div
        className="bg-white/60 border border-border-subtle rounded-xl p-3 hover:border-accent-primary/30 transition-colors cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100">
            <Zap className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <span className="text-sm font-medium text-text-primary">Free Plan</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 py-1.5 bg-yellow-50 rounded-lg">
          <Crown className="w-3 h-3 text-yellow-600" />
          <span className="text-xs text-yellow-700 font-medium">
            Upgrade to Premium
          </span>
          <ArrowRight className="w-3 h-3 text-yellow-600" />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="px-1 mb-2">{renderBadgeContent()}</div>

      <PlanSelectorModal
        isOpen={showModal}
        currentTier={currentTier}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
