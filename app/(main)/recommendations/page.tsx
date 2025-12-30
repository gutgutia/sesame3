"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  GraduationCap,
  Sun,
  Sparkles,
  ChevronRight,
  X,
  Bookmark,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface Recommendation {
  id: string;
  category: "school" | "program" | "activity" | "general";
  title: string;
  subtitle: string | null;
  reasoning: string;
  fitScore: number | null;
  priority: "high" | "medium" | "low" | null;
  actionItems: string[];
  relevantGrade: string | null;
  expiresAt: string | null;
  status: string;
  generatedAt: string;
  schoolId: string | null;
  summerProgramId: string | null;
  school?: { id: string; name: string; city: string | null; state: string | null } | null;
  summerProgram?: { id: string; name: string; organization: string } | null;
}

interface StageInfo {
  stage: string;
  grade: string;
  season: string;
  description: string;
  priorities: string[];
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  stage: StageInfo;
  lastGenerated: string | null;
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [stage, setStage] = useState<StageInfo | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing recommendations
  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/recommendations");
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      const data: RecommendationsResponse = await res.json();
      setRecommendations(data.recommendations);
      setStage(data.stage);
      setLastGenerated(data.lastGenerated);
    } catch (err) {
      setError("Failed to load recommendations");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate new recommendations
  const generateRecommendations = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const res = await fetch("/api/recommendations", { method: "POST" });
      if (!res.ok) throw new Error("Failed to generate recommendations");
      const data = await res.json();
      setRecommendations(data.recommendations);
      setStage(data.stage);
      setLastGenerated(new Date().toISOString());
    } catch (err) {
      setError("Failed to generate recommendations");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Dismiss a recommendation
  const dismissRecommendation = async (id: string) => {
    try {
      await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss" }),
      });
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to dismiss recommendation:", err);
    }
  };

  // Save a recommendation
  const saveRecommendation = async (id: string) => {
    try {
      await fetch(`/api/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save" }),
      });
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "saved" } : r))
      );
    } catch (err) {
      console.error("Failed to save recommendation:", err);
    }
  };

  // Add school/program to list
  const addToList = async (rec: Recommendation) => {
    try {
      if (rec.category === "school" && rec.schoolId) {
        // Add school to student's list
        const res = await fetch("/api/profile/schools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: rec.schoolId,
            tier: rec.subtitle?.toLowerCase().includes("reach")
              ? "reach"
              : rec.subtitle?.toLowerCase().includes("safety")
                ? "safety"
                : "target",
          }),
        });
        if (!res.ok) throw new Error("Failed to add school");
      } else if (rec.category === "program" && rec.summerProgramId) {
        // Add program to student's list
        const res = await fetch("/api/opportunities/summer-programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summerProgramId: rec.summerProgramId,
          }),
        });
        if (!res.ok) throw new Error("Failed to add program");
      }

      // Mark recommendation as acted upon
      await fetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acted_upon" }),
      });

      setRecommendations((prev) =>
        prev.map((r) => (r.id === rec.id ? { ...r, status: "acted_upon" } : r))
      );
    } catch (err) {
      console.error("Failed to add to list:", err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Group recommendations by category
  const schoolRecs = recommendations.filter((r) => r.category === "school");
  const programRecs = recommendations.filter((r) => r.category === "program");
  const generalRecs = recommendations.filter((r) => r.category === "general" || r.category === "activity");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-text-main mb-2">
            Recommendations
          </h1>
          <p className="text-text-muted">
            Personalized suggestions based on your profile and goals.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastGenerated && (
            <span className="text-sm text-text-muted">
              Last updated:{" "}
              {new Date(lastGenerated).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          <Button
            onClick={generateRecommendations}
            disabled={isGenerating}
            variant="primary"
          >
            <RefreshCw
              className={cn("w-4 h-4", isGenerating && "animate-spin")}
            />
            {isGenerating ? "Generating..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Stage Context Card */}
      {stage && (
        <div className="bg-accent-surface/50 border border-accent-border rounded-[20px] p-5 mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="font-display font-bold text-text-main">
                {stage.grade} - {stage.season.charAt(0).toUpperCase() + stage.season.slice(1)}
              </h2>
              <p className="text-sm text-text-muted">{stage.description}</p>
            </div>
          </div>
          {stage.priorities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {stage.priorities.map((priority, i) => (
                <span
                  key={i}
                  className="px-3 py-1 text-xs font-medium bg-white text-text-muted rounded-full border border-border-subtle"
                >
                  {priority}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && !isGenerating && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-bg-sidebar rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-text-muted" />
          </div>
          <h2 className="font-display font-bold text-xl text-text-main mb-2">
            No Recommendations Yet
          </h2>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            Click the Refresh button to generate personalized recommendations
            based on your profile.
          </p>
          <Button onClick={generateRecommendations} disabled={isGenerating}>
            <Sparkles className="w-4 h-4" />
            Generate Recommendations
          </Button>
        </div>
      )}

      {/* Recommendations Grid */}
      {recommendations.length > 0 && (
        <div className="space-y-8">
          {/* School Recommendations */}
          {schoolRecs.length > 0 && (
            <RecommendationSection
              title="School Recommendations"
              icon={GraduationCap}
              recommendations={schoolRecs}
              onDismiss={dismissRecommendation}
              onSave={saveRecommendation}
              onAddToList={addToList}
            />
          )}

          {/* Program Recommendations */}
          {programRecs.length > 0 && (
            <RecommendationSection
              title="Program Recommendations"
              icon={Sun}
              recommendations={programRecs}
              onDismiss={dismissRecommendation}
              onSave={saveRecommendation}
              onAddToList={addToList}
            />
          )}

          {/* General Recommendations */}
          {generalRecs.length > 0 && (
            <RecommendationSection
              title="Action Items"
              icon={CheckCircle2}
              recommendations={generalRecs}
              onDismiss={dismissRecommendation}
              onSave={saveRecommendation}
              onAddToList={addToList}
            />
          )}
        </div>
      )}
    </>
  );
}

// =============================================================================
// COMPONENTS
// =============================================================================

function RecommendationSection({
  title,
  icon: Icon,
  recommendations,
  onDismiss,
  onSave,
  onAddToList,
}: {
  title: string;
  icon: React.ElementType;
  recommendations: Recommendation[];
  onDismiss: (id: string) => void;
  onSave: (id: string) => void;
  onAddToList: (rec: Recommendation) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-text-muted" />
        <h2 className="font-display font-bold text-lg text-text-main">
          {title}
        </h2>
        <span className="text-sm text-text-muted">
          ({recommendations.length})
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            onDismiss={() => onDismiss(rec.id)}
            onSave={() => onSave(rec.id)}
            onAddToList={() => onAddToList(rec)}
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onDismiss,
  onSave,
  onAddToList,
}: {
  recommendation: Recommendation;
  onDismiss: () => void;
  onSave: () => void;
  onAddToList: () => void;
}) {
  const priorityColors = {
    high: "bg-red-100 text-red-700 border-red-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-green-100 text-green-700 border-green-200",
  };

  const categoryIcons = {
    school: GraduationCap,
    program: Sun,
    activity: Sparkles,
    general: CheckCircle2,
  };

  const CategoryIcon = categoryIcons[recommendation.category];
  const isSaved = recommendation.status === "saved";

  return (
    <div
      className={cn(
        "bg-white border rounded-[20px] p-5 shadow-card transition-all hover:shadow-lg",
        isSaved ? "border-accent-primary" : "border-border-subtle"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-bg-sidebar rounded-lg flex items-center justify-center">
            <CategoryIcon className="w-4 h-4 text-text-muted" />
          </div>
          {recommendation.priority && (
            <span
              className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full border",
                priorityColors[recommendation.priority]
              )}
            >
              {recommendation.priority}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            className={cn(
              "p-1.5 rounded-lg transition-colors",
              isSaved
                ? "text-accent-primary bg-accent-surface"
                : "text-text-muted hover:bg-bg-sidebar"
            )}
            title={isSaved ? "Saved" : "Save"}
          >
            <Bookmark
              className={cn("w-4 h-4", isSaved && "fill-current")}
            />
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 rounded-lg text-text-muted hover:bg-bg-sidebar transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Title & Subtitle */}
      <h3 className="font-display font-bold text-text-main mb-1">
        {recommendation.title}
      </h3>
      {recommendation.subtitle && (
        <p className="text-sm text-text-muted mb-3">{recommendation.subtitle}</p>
      )}

      {/* Reasoning */}
      <p className="text-sm text-text-main mb-4 line-clamp-3">
        {recommendation.reasoning}
      </p>

      {/* Fit Score */}
      {recommendation.fitScore !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-text-muted">Fit Score</span>
            <span className="font-medium text-text-main">
              {Math.round(recommendation.fitScore * 100)}%
            </span>
          </div>
          <div className="h-1.5 bg-bg-sidebar rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-primary rounded-full"
              style={{ width: `${recommendation.fitScore * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Items */}
      {recommendation.actionItems.length > 0 && (
        <div className="border-t border-border-subtle pt-3 mt-3">
          <h4 className="text-xs font-medium text-text-muted mb-2">
            Next Steps
          </h4>
          <ul className="space-y-1">
            {recommendation.actionItems.slice(0, 2).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="w-3 h-3 mt-1 text-text-muted shrink-0" />
                <span className="text-text-main">{item}</span>
              </li>
            ))}
            {recommendation.actionItems.length > 2 && (
              <li className="text-xs text-text-muted">
                +{recommendation.actionItems.length - 2} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Expiry */}
      {recommendation.expiresAt && (
        <div className="flex items-center gap-1 text-xs text-text-muted mt-3">
          <Clock className="w-3 h-3" />
          Deadline:{" "}
          {new Date(recommendation.expiresAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </div>
      )}

      {/* Add to List Button - only show for schools/programs that are in our DB */}
      {(recommendation.schoolId || recommendation.summerProgramId) && (
        <div className="mt-4 pt-3 border-t border-border-subtle">
          {recommendation.status === "acted_upon" ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              Added to your list
            </div>
          ) : (
            <button
              onClick={onAddToList}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-accent-primary text-white rounded-xl text-sm font-medium hover:bg-accent-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add to My {recommendation.category === "school" ? "Schools" : "Programs"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
