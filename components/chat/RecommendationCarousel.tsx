"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  FlaskConical,
  School,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  DollarSign,
  ExternalLink,
  Plus,
  Check,
  Loader2,
  Calendar,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

interface ProgramRecommendation {
  id: string;
  name: string;
  shortName?: string;
  organization: string;
  description?: string;
  location?: string;
  duration?: string;
  focusAreas: string[];
  selectivity?: string;
  cost?: number;
  stipend?: number;
  applicationDeadline?: string;
  websiteUrl?: string;
  eligibility: {
    status: "eligible" | "check_required" | "unknown";
    summary: string;
  };
}

interface SchoolRecommendation {
  id: string;
  name: string;
  shortName?: string;
  city?: string;
  state?: string;
  type?: string;
  acceptanceRate?: number;
  satRange25?: number;
  satRange75?: number;
  actRange25?: number;
  actRange75?: number;
  avgGpaUnweighted?: number;
  undergradEnrollment?: number;
  match: {
    tier: "reach" | "target" | "safety";
    satMatch: "below" | "within" | "above" | "unknown";
    actMatch: "below" | "within" | "above" | "unknown";
    gpaMatch: "below" | "within" | "above" | "unknown";
    overallFit: number;
  };
}

interface RecommendationCarouselProps {
  type: "program_recommendations" | "school_recommendations";
  data?: {
    focusArea?: string;
    tier?: string;
  };
  onAddToList?: (item: ProgramRecommendation | SchoolRecommendation) => void;
  onDismiss?: () => void;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RecommendationCarousel({
  type,
  data,
  onAddToList,
  onDismiss,
}: RecommendationCarouselProps) {
  const [items, setItems] = useState<(ProgramRecommendation | SchoolRecommendation)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const isPrograms = type === "program_recommendations";

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const endpoint = isPrograms
          ? `/api/recommendations/programs${data?.focusArea ? `?focus=${data.focusArea}` : ""}`
          : `/api/recommendations/schools${data?.tier ? `?tier=${data.tier}` : ""}`;

        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("Failed to fetch");

        const result = await response.json();
        setItems(isPrograms ? result.programs : result.schools);
      } catch (err) {
        setError("Unable to load recommendations");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [type, data, isPrograms]);

  // Scroll handlers
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const handleAdd = async (item: ProgramRecommendation | SchoolRecommendation) => {
    if (addedIds.has(item.id)) return;

    try {
      if (isPrograms) {
        // Add program to student's program list
        await fetch("/api/profile/programs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: (item as ProgramRecommendation).name,
            organization: (item as ProgramRecommendation).organization,
            type: "summer",
            status: "interested",
          }),
        });
      } else {
        // Add school to student's school list
        await fetch("/api/profile/schools", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolId: item.id,
            tier: (item as SchoolRecommendation).match.tier,
          }),
        });
      }

      setAddedIds(prev => new Set([...prev, item.id]));
      onAddToList?.(item);
    } catch (err) {
      console.error("Failed to add:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-accent-surface/30 rounded-xl p-6 mt-3 animate-in fade-in">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
          <span className="ml-2 text-sm text-text-muted">Finding recommendations...</span>
        </div>
      </div>
    );
  }

  if (error || items.length === 0) {
    return (
      <div className="bg-accent-surface/30 rounded-xl p-6 mt-3 animate-in fade-in">
        <div className="text-center py-4">
          <p className="text-sm text-text-muted">
            {error || "No recommendations found based on your profile"}
          </p>
        </div>
      </div>
    );
  }

  const Icon = isPrograms ? FlaskConical : School;
  const title = isPrograms ? "Recommended Programs" : "Schools for You";

  return (
    <div className="bg-accent-surface/30 border border-accent-border/50 rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-accent-primary" />
          <span className="text-sm font-semibold text-text-main">{title}</span>
          <span className="text-xs text-text-muted">({items.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-lg hover:bg-white/50 text-text-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-lg hover:bg-white/50 text-text-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map(item =>
          isPrograms ? (
            <ProgramCard
              key={item.id}
              program={item as ProgramRecommendation}
              isAdded={addedIds.has(item.id)}
              onAdd={() => handleAdd(item)}
            />
          ) : (
            <SchoolCard
              key={item.id}
              school={item as SchoolRecommendation}
              isAdded={addedIds.has(item.id)}
              onAdd={() => handleAdd(item)}
            />
          )
        )}
      </div>

      {/* Footer */}
      {onDismiss && (
        <div className="mt-3 pt-3 border-t border-border-subtle flex justify-end">
          <button
            onClick={onDismiss}
            className="text-xs text-text-muted hover:text-text-main transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// PROGRAM CARD
// =============================================================================

function ProgramCard({
  program,
  isAdded,
  onAdd,
}: {
  program: ProgramRecommendation;
  isAdded: boolean;
  onAdd: () => void;
}) {
  const deadlineDate = program.applicationDeadline
    ? new Date(program.applicationDeadline)
    : null;
  const isDeadlineSoon = deadlineDate && deadlineDate.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;

  return (
    <div
      className="flex-shrink-0 w-64 bg-white rounded-xl border border-border-subtle p-4 shadow-sm hover:shadow-md transition-shadow"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-text-main text-sm line-clamp-1">
          {program.shortName || program.name}
        </h4>
        <p className="text-xs text-text-muted line-clamp-1">{program.organization}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        <EligibilityBadge status={program.eligibility.status} />
        {program.selectivity && (
          <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
            {program.selectivity.replace("_", " ")}
          </span>
        )}
      </div>

      {/* Details */}
      <div className="space-y-1.5 mb-3 text-xs text-text-secondary">
        {program.location && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-text-muted" />
            <span className="line-clamp-1">{program.location}</span>
          </div>
        )}
        {program.duration && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-text-muted" />
            <span>{program.duration}</span>
          </div>
        )}
        {deadlineDate && (
          <div className={cn(
            "flex items-center gap-1.5",
            isDeadlineSoon && "text-orange-600 font-medium"
          )}>
            <Calendar className="w-3 h-3" />
            <span>Due {deadlineDate.toLocaleDateString()}</span>
          </div>
        )}
        {(program.cost !== undefined || program.stipend) && (
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-text-muted" />
            <span>
              {program.stipend
                ? `+$${program.stipend.toLocaleString()} stipend`
                : program.cost === 0
                  ? "Free"
                  : `$${program.cost?.toLocaleString()}`}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAdd}
          disabled={isAdded}
          className={cn(
            "flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors",
            isAdded
              ? "bg-green-100 text-green-700"
              : "bg-accent-primary text-white hover:bg-accent-hover"
          )}
        >
          {isAdded ? (
            <>
              <Check className="w-3 h-3" /> Added
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" /> Add
            </>
          )}
        </button>
        {program.websiteUrl && (
          <a
            href={program.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg border border-border-medium text-text-muted hover:text-accent-primary hover:border-accent-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SCHOOL CARD
// =============================================================================

function SchoolCard({
  school,
  isAdded,
  onAdd,
}: {
  school: SchoolRecommendation;
  isAdded: boolean;
  onAdd: () => void;
}) {
  const tierColors = {
    reach: "bg-red-50 text-red-700 border-red-200",
    target: "bg-amber-50 text-amber-700 border-amber-200",
    safety: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div
      className="flex-shrink-0 w-64 bg-white rounded-xl border border-border-subtle p-4 shadow-sm hover:shadow-md transition-shadow"
      style={{ scrollSnapAlign: "start" }}
    >
      {/* Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-text-main text-sm line-clamp-1">
          {school.shortName || school.name}
        </h4>
        {school.city && school.state && (
          <p className="text-xs text-text-muted">
            {school.city}, {school.state}
          </p>
        )}
      </div>

      {/* Tier Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded border font-medium uppercase",
          tierColors[school.match.tier]
        )}>
          {school.match.tier}
        </span>
        <span className="text-[10px] text-text-muted">
          {school.match.overallFit}% fit
        </span>
      </div>

      {/* Stats */}
      <div className="space-y-1.5 mb-3 text-xs text-text-secondary">
        {school.acceptanceRate && (
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-text-muted" />
            <span>{(school.acceptanceRate * 100).toFixed(1)}% acceptance</span>
          </div>
        )}
        {school.satRange25 && school.satRange75 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 text-[10px] font-bold text-text-muted">SAT</span>
            <span>{school.satRange25}-{school.satRange75}</span>
            <MatchIndicator match={school.match.satMatch} />
          </div>
        )}
        {school.actRange25 && school.actRange75 && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 text-[10px] font-bold text-text-muted">ACT</span>
            <span>{school.actRange25}-{school.actRange75}</span>
            <MatchIndicator match={school.match.actMatch} />
          </div>
        )}
        {school.undergradEnrollment && (
          <div className="flex items-center gap-1.5">
            <Users className="w-3 h-3 text-text-muted" />
            <span>{school.undergradEnrollment.toLocaleString()} students</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={onAdd}
        disabled={isAdded}
        className={cn(
          "w-full py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition-colors",
          isAdded
            ? "bg-green-100 text-green-700"
            : "bg-accent-primary text-white hover:bg-accent-hover"
        )}
      >
        {isAdded ? (
          <>
            <Check className="w-3 h-3" /> Added to List
          </>
        ) : (
          <>
            <Plus className="w-3 h-3" /> Add to List
          </>
        )}
      </button>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function EligibilityBadge({ status }: { status: "eligible" | "check_required" | "unknown" }) {
  const styles = {
    eligible: "bg-green-50 text-green-700",
    check_required: "bg-yellow-50 text-yellow-700",
    unknown: "bg-gray-50 text-gray-600",
  };

  const labels = {
    eligible: "Eligible",
    check_required: "Review",
    unknown: "Check",
  };

  return (
    <span className={cn("text-[10px] px-1.5 py-0.5 rounded", styles[status])}>
      {labels[status]}
    </span>
  );
}

function MatchIndicator({ match }: { match: "below" | "within" | "above" | "unknown" }) {
  if (match === "unknown") return null;

  const styles = {
    below: "text-red-500",
    within: "text-amber-500",
    above: "text-green-500",
  };

  const icons = {
    below: "↓",
    within: "•",
    above: "↑",
  };

  return (
    <span className={cn("text-[10px] font-bold", styles[match])}>
      {icons[match]}
    </span>
  );
}
