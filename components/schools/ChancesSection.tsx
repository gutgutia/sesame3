"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  MessageSquare,
  BarChart3,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { ChancesResult } from "@/lib/chances/types";

// =============================================================================
// TYPES
// =============================================================================

interface ChancesSectionProps {
  schoolId: string;
  schoolName: string;
  calculatedChance: number | null;
  chanceUpdatedAt: string | null;
  profileChangedSinceChanceCheck: boolean;
  onChanceCalculated: (result: ChancesResult) => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ChancesSection({
  schoolId,
  schoolName,
  calculatedChance,
  chanceUpdatedAt,
  profileChangedSinceChanceCheck,
  onChanceCalculated,
}: ChancesSectionProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChancesResult | null>(null);
  // Default to collapsed if we already have a chance, expanded if not
  const [isExpanded, setIsExpanded] = useState(calculatedChance === null);

  const hasExistingChance = calculatedChance !== null;
  const showOutdatedBanner = hasExistingChance && profileChangedSinceChanceCheck;

  // Calculate chances
  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);
    setCalculationProgress("Analyzing your profile...");

    try {
      // Progress steps for UX
      const progressSteps = [
        { delay: 500, text: "Comparing academics..." },
        { delay: 1500, text: "Evaluating activities..." },
        { delay: 2500, text: "Assessing overall fit..." },
      ];

      progressSteps.forEach(({ delay, text }) => {
        setTimeout(() => setCalculationProgress(text), delay);
      });

      const res = await fetch("/api/chances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to calculate chances");
      }

      const calcResult: ChancesResult = await res.json();
      setResult(calcResult);
      onChanceCalculated(calcResult);
    } catch (err) {
      console.error("Calculation error:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate chances");
    } finally {
      setIsCalculating(false);
      setCalculationProgress("");
    }
  };

  // Use fresh result if available, otherwise construct from stored data
  const displayResult = result || (hasExistingChance ? {
    probability: Math.round(calculatedChance * 100),
    tier: getTierFromProbability(calculatedChance * 100),
    calculatedAt: chanceUpdatedAt ? new Date(chanceUpdatedAt) : new Date(),
  } as Partial<ChancesResult> : null);

  // Format date
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // =============================================================================
  // STATE 1: Never checked
  // =============================================================================
  if (!hasExistingChance && !result) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-accent-primary" />
            <h2 className="font-display font-bold text-lg text-text-main">Your Chances</h2>
          </div>
          {!isCalculating && (
            <Button size="sm" onClick={handleCalculate}>
              <TrendingUp className="w-4 h-4" />
              Check Chances
            </Button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {isCalculating ? (
          <div className="text-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary mx-auto mb-2" />
            <p className="text-sm text-text-muted">{calculationProgress}</p>
          </div>
        ) : (
          <p className="text-text-muted text-sm">
            See how your profile compares to {schoolName}&apos;s admitted student profile.
          </p>
        )}
      </Card>
    );
  }

  // =============================================================================
  // STATE 2 & 3: Has result (fresh or stored)
  // =============================================================================

  // Collapsed view - compact summary
  if (!isExpanded && !isCalculating) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent-primary" />
              <h2 className="font-display font-bold text-text-main">Your Chances</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-text-main">
                {displayResult?.probability}%
              </span>
              <TierBadge tier={displayResult?.tier || "target"} />
            </div>
            {showOutdatedBanner && !result && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                Outdated
              </span>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </Card>
    );
  }

  // Expanded view - full details
  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-accent-primary" />
          <h2 className="font-display font-bold text-lg text-text-main">Your Chances</h2>
        </div>
        <div className="flex items-center gap-2">
          {displayResult?.calculatedAt && (
            <span className="text-xs text-text-muted">
              Last checked {formatDate(displayResult.calculatedAt)}
            </span>
          )}
          {!isCalculating && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Outdated banner */}
      {showOutdatedBanner && !result && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-amber-800 font-medium">Your profile has changed</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Update your chances to see how recent changes affect your odds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Calculating state */}
      {isCalculating ? (
        <div className="text-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-accent-primary mx-auto mb-2" />
          <p className="text-sm text-text-muted">{calculationProgress}</p>
        </div>
      ) : (
        <>
          {/* Probability display */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-text-main">
                  {displayResult?.probability}%
                </span>
                <TierBadge tier={displayResult?.tier || "target"} />
              </div>
              {result?.summary && (
                <p className="text-sm text-text-muted mt-2">{result.summary}</p>
              )}
            </div>
          </div>

          {/* Factor breakdown - only if we have full result */}
          {result?.factors ? (
            <div className="bg-bg-sidebar rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-accent-primary" />
                <h3 className="font-medium text-text-main">Factor Breakdown</h3>
              </div>

              <div className="space-y-3">
                <FactorBar
                  label="Academics"
                  score={result.factors.academics.score}
                  impact={result.factors.academics.impact}
                  details={result.factors.academics.details}
                />
                <FactorBar
                  label="Testing"
                  score={result.factors.testing.score}
                  impact={result.factors.testing.impact}
                  details={result.factors.testing.details}
                />
                <FactorBar
                  label="Activities"
                  score={result.factors.activities.score}
                  impact={result.factors.activities.impact}
                  details={result.factors.activities.details}
                />
                <FactorBar
                  label="Awards"
                  score={result.factors.awards.score}
                  impact={result.factors.awards.impact}
                  details={result.factors.awards.details}
                />
              </div>
            </div>
          ) : hasExistingChance && !result && (
            <div className="bg-bg-sidebar rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-text-muted" />
                <h3 className="font-medium text-text-main">Factor Breakdown</h3>
              </div>
              <p className="text-sm text-text-muted">
                Click &quot;Recalculate&quot; to see the detailed factor breakdown and personalized insights.
              </p>
            </div>
          )}

          {/* Improvements - only if we have full result */}
          {result?.improvements && result.improvements.length > 0 && (
            <div className="bg-bg-sidebar rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="font-medium text-text-main">What Could Help</h3>
              </div>

              <div className="space-y-2">
                {result.improvements.slice(0, 3).map((improvement, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full mt-2",
                        improvement.priority === "high" && "bg-accent-primary",
                        improvement.priority === "medium" && "bg-amber-500",
                        improvement.priority === "low" && "bg-text-muted"
                      )}
                    />
                    <div className="flex-1">
                      <span className="text-sm text-text-main">{improvement.action}</span>
                      <span className="text-xs text-accent-primary ml-2">
                        {improvement.potentialImpact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href={`/advisor?mode=chances&school=${schoolId}`} className="flex-1">
              <Button variant="secondary" className="w-full">
                <MessageSquare className="w-4 h-4" />
                Discuss with Advisor
              </Button>
            </Link>
            <Button
              variant={showOutdatedBanner && !result ? "primary" : "secondary"}
              onClick={handleCalculate}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4" />
              {showOutdatedBanner && !result ? "Update Chances" : "Recalculate"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    safety: "bg-emerald-50 text-emerald-700 border-emerald-200",
    likely: "bg-green-50 text-green-700 border-green-200",
    target: "bg-amber-50 text-amber-700 border-amber-200",
    reach: "bg-orange-50 text-orange-700 border-orange-200",
    unlikely: "bg-rose-50 text-rose-700 border-rose-200",
  };

  const labels: Record<string, string> = {
    safety: "Safety",
    likely: "Likely",
    target: "Target",
    reach: "Reach",
    unlikely: "Unlikely",
  };

  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium border",
        styles[tier] || "bg-gray-50 text-gray-700 border-gray-200"
      )}
    >
      {labels[tier] || tier}
    </span>
  );
}

interface FactorBarProps {
  label: string;
  score: number;
  impact: string;
  details: string;
}

function FactorBar({ label, score, impact, details }: FactorBarProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "strong_positive":
        return "bg-emerald-500";
      case "positive":
        return "bg-green-400";
      case "neutral":
        return "bg-amber-400";
      case "negative":
        return "bg-orange-400";
      case "strong_negative":
        return "bg-rose-500";
      default:
        return "bg-gray-400";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "strong_positive":
      case "positive":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case "neutral":
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
      case "negative":
      case "strong_negative":
        return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {getImpactIcon(impact)}
          <span className="text-sm font-medium text-text-main">{label}</span>
        </div>
        <span className="text-xs text-text-muted">{Math.round(score)}/100</span>
      </div>
      <div className="h-1.5 bg-white rounded-full overflow-hidden mb-1">
        <div
          className={cn("h-full rounded-full transition-all", getImpactColor(impact))}
          style={{ width: `${Math.round(score)}%` }}
        />
      </div>
      <p className="text-xs text-text-muted">{details}</p>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getTierFromProbability(probability: number): string {
  if (probability < 15) return "unlikely";
  if (probability < 30) return "reach";
  if (probability < 50) return "target";
  if (probability < 70) return "likely";
  return "safety";
}
