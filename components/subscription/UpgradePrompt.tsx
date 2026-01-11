"use client";

/**
 * UpgradePrompt - Shows upgrade prompts when users hit limits
 *
 * Two-tier system: Free -> Paid ($25/mo or $250/year)
 *
 * NOTE: In native mobile apps (iOS/Android), upgrade buttons are hidden
 * to avoid Apple's 30% commission. Users see only the limit message
 * and reset timer.
 */

import React, { useState } from "react";
import { Crown, ArrowRight, X, Clock, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useShowUpgradeUI } from "@/lib/context/PlatformContext";

// =============================================================================
// TYPES
// =============================================================================

interface UpgradePromptProps {
  /**
   * Variant determines the presentation:
   * - inline: Shows in the chat flow
   * - modal: Shows as a centered modal
   * - banner: Shows as a top banner
   */
  variant?: "inline" | "modal" | "banner";

  /**
   * Message to display (e.g., "You've reached your daily limit")
   */
  message?: string;

  /**
   * When the limit resets
   */
  resetTime?: Date;

  /**
   * Callback when user dismisses
   */
  onDismiss?: () => void;

  /**
   * Whether to show the dismiss button
   */
  showDismiss?: boolean;

  /**
   * Feature that triggered this prompt (for context)
   */
  feature?: "messages" | "chances" | "recommendations";
}

// =============================================================================
// UPGRADE PROMPT COMPONENT
// =============================================================================

export function UpgradePrompt({
  variant = "inline",
  message = "You've reached your daily message limit",
  resetTime,
  onDismiss,
  showDismiss = true,
  feature,
}: UpgradePromptProps) {
  const [isLoading, setIsLoading] = useState(false);
  const showUpgradeUI = useShowUpgradeUI();

  // Format reset time
  const formatResetTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  };

  // Handle upgrade click
  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "paid", yearly: true }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const error = await res.json();
        alert(error.message || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  // Feature-specific messaging
  const getFeatureDescription = () => {
    switch (feature) {
      case "chances":
        return "Upgrade to Premium for unlimited chances calculations.";
      case "recommendations":
        return "Upgrade to Premium for personalized school and program recommendations.";
      case "messages":
      default:
        return "Upgrade to Premium for unlimited messages and our smartest AI advisor.";
    }
  };

  // Inline variant (for chat)
  if (variant === "inline") {
    return (
      <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200/50 rounded-2xl p-6 my-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
            <Crown className="w-6 h-6 text-yellow-600" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-text-primary mb-1">{message}</h3>

            {resetTime && (
              <p className="text-sm text-text-muted mb-4 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Resets in {formatResetTime(resetTime)}
              </p>
            )}

            {/* Only show upgrade text and buttons on web */}
            {showUpgradeUI ? (
              <>
                <p className="text-sm text-text-secondary mb-4">
                  {getFeatureDescription()}
                </p>

                <Button onClick={handleUpgrade} disabled={isLoading} className="gap-2">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      Upgrade to Premium
                      <span className="text-white/70">$25/mo</span>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-text-secondary">
                Your limit will reset automatically. Check back soon!
              </p>
            )}
          </div>

          {showDismiss && onDismiss && (
            <button
              onClick={onDismiss}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Banner variant (for top of page)
  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5" />
            <span className="font-medium">{message}</span>
            {resetTime && (
              <span className="text-white/70 text-sm">
                • Resets in {formatResetTime(resetTime)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Only show upgrade button on web */}
            {showUpgradeUI && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleUpgrade}
                disabled={isLoading}
                className="bg-white text-yellow-600 hover:bg-white/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Upgrade to Premium
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            )}

            {showDismiss && onDismiss && (
              <button onClick={onDismiss} className="text-white/70 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modal variant
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        {showDismiss && onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center mb-4">
            <Crown className="w-8 h-8 text-yellow-600" />
          </div>

          <h2 className="text-xl font-semibold text-text-primary mb-2">
            {message}
          </h2>

          {resetTime && (
            <p className="text-text-muted flex items-center justify-center gap-1">
              <Clock className="w-4 h-4" />
              Resets in {formatResetTime(resetTime)}
            </p>
          )}
        </div>

        {/* Only show upgrade options on web */}
        {showUpgradeUI ? (
          <>
            <p className="text-center text-text-secondary mb-6">
              {getFeatureDescription()}
            </p>

            <div className="space-y-3">
              <Button className="w-full gap-2" onClick={handleUpgrade} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    Upgrade to Premium — $25/mo
                  </>
                )}
              </Button>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="w-full text-center text-sm text-text-muted hover:text-text-primary transition-colors py-2"
                >
                  Maybe later
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-text-secondary mb-6">
              Your limit will reset automatically. Check back soon!
            </p>

            {onDismiss && (
              <Button
                variant="secondary"
                className="w-full"
                onClick={onDismiss}
              >
                Got it
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// EXPORT HOOK FOR CHAT
// =============================================================================

/**
 * Hook to parse usage limit error and show upgrade prompt
 */
export function useUpgradePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptData, setPromptData] = useState<{
    message: string;
    resetTime?: Date;
    feature?: "messages" | "chances" | "recommendations";
  } | null>(null);

  const handleUsageLimitError = (error: {
    error: string;
    message: string;
    usage?: {
      dailyLimit: number;
      messageLimit: number;
    };
    resetTime?: string;
    feature?: "messages" | "chances" | "recommendations";
  }) => {
    if (
      error.error === "usage_limit_exceeded" ||
      error.error === "free_tier_limit" ||
      error.error === "paid_feature"
    ) {
      setPromptData({
        message: error.message,
        resetTime: error.resetTime ? new Date(error.resetTime) : undefined,
        feature: error.feature,
      });
      setShowPrompt(true);
      return true;
    }
    return false;
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    setPromptData(null);
  };

  return {
    showPrompt,
    promptData,
    handleUsageLimitError,
    dismissPrompt,
  };
}
