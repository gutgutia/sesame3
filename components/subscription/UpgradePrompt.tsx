"use client";

/**
 * UpgradePrompt - Shows usage limit message with upgrade options
 *
 * NOTE: In native mobile apps (iOS/Android), upgrade buttons are hidden
 * to avoid Apple's 30% commission. Users see only the limit message
 * and reset timer.
 */

import React, { useState } from "react";
import {
  Sparkles,
  Crown,
  ArrowRight,
  X,
  Clock,
  Zap,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
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
   * Current tier to determine what to show
   */
  currentTier?: "free" | "standard";
  
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
}

// =============================================================================
// UPGRADE PROMPT COMPONENT
// =============================================================================

export function UpgradePrompt({
  variant = "inline",
  currentTier = "free",
  message = "You've reached your daily message limit",
  resetTime,
  onDismiss,
  showDismiss = true,
}: UpgradePromptProps) {
  const [isLoading, setIsLoading] = useState<"standard" | "premium" | null>(null);
  const showUpgradeUI = useShowUpgradeUI();

  // Determine next tier to upgrade to
  const nextTier = currentTier === "free" ? "standard" : "premium";
  const nextTierName = nextTier === "standard" ? "Standard" : "Premium";
  const nextTierPrice = nextTier === "standard" ? "$9.99" : "$24.99";
  const NextTierIcon = nextTier === "standard" ? Sparkles : Crown;

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
  const handleUpgrade = async (plan: "standard" | "premium") => {
    setIsLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, yearly: true }),
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
      setIsLoading(null);
    }
  };

  // Inline variant (for chat)
  if (variant === "inline") {
    return (
      <div className="bg-gradient-to-br from-accent-surface to-yellow-50 border border-accent-primary/20 rounded-2xl p-6 my-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-primary/10 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-accent-primary" />
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-text-primary mb-1">
              {message}
            </h3>

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
                  Upgrade to {nextTierName} for more messages and a more powerful advisor.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => handleUpgrade(nextTier)}
                    disabled={!!isLoading}
                    className="gap-2"
                  >
                    {isLoading === nextTier ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <NextTierIcon className="w-4 h-4" />
                        Upgrade to {nextTierName}
                        <span className="text-white/70">{nextTierPrice}/mo</span>
                      </>
                    )}
                  </Button>

                  {currentTier === "free" && (
                    <Button
                      variant="secondary"
                      onClick={() => handleUpgrade("premium")}
                      disabled={!!isLoading}
                      className="gap-2"
                    >
                      {isLoading === "premium" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Crown className="w-4 h-4" />
                          Go Premium
                        </>
                      )}
                    </Button>
                  )}
                </div>
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
      <div className="bg-gradient-to-r from-accent-primary to-yellow-500 text-white px-4 py-3">
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
                onClick={() => handleUpgrade(nextTier)}
                disabled={!!isLoading}
                className="bg-white text-accent-primary hover:bg-white/90"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Upgrade to {nextTierName}
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
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent-primary to-yellow-400 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-white" />
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
              Upgrade your plan for more messages and access to our most powerful AI advisor.
            </p>

            <div className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={() => handleUpgrade(nextTier)}
                disabled={!!isLoading}
              >
                {isLoading === nextTier ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <NextTierIcon className="w-4 h-4" />
                    Upgrade to {nextTierName} — {nextTierPrice}/mo
                  </>
                )}
              </Button>

              {currentTier === "free" && (
                <Button
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={() => handleUpgrade("premium")}
                  disabled={!!isLoading}
                >
                  {isLoading === "premium" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Crown className="w-4 h-4" />
                      Go Premium — $24.99/mo
                    </>
                  )}
                </Button>
              )}

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
    currentTier?: "free" | "standard";
  } | null>(null);

  const handleUsageLimitError = (error: {
    error: string;
    message: string;
    usage: {
      dailyLimit: number;
      messageLimit: number;
    };
    resetTime?: string;
  }) => {
    if (error.error === "usage_limit_exceeded") {
      setPromptData({
        message: error.message,
        resetTime: error.resetTime ? new Date(error.resetTime) : undefined,
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

