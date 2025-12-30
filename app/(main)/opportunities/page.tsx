"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Sun,
  FlaskConical,
  Briefcase,
  Trophy,
  GraduationCap,
  Plus,
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  MoreVertical,
  Check,
  ChevronDown,
  X,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import {
  calculateEligibility,
  getEligibilityBadge,
  type EligibilityResult,
} from "@/lib/eligibility/calculate-eligibility";

// =============================================================================
// TYPES
// =============================================================================

type OpportunityTab = "summer" | "research" | "internships" | "competitions" | "scholarships";

interface SummerProgram {
  id: string;
  name: string;
  shortName?: string | null;
  organization: string;
  description?: string | null;
  websiteUrl?: string | null;
  programYear: number;
  minGrade?: number | null;
  maxGrade?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  minGpaUnweighted?: number | null;
  citizenship?: string | null;
  requiredCourses?: string[];
  otherRequirements?: string[];
  applicationDeadline?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  duration?: string | null;
  format?: string | null;
  location?: string | null;
  cost?: number | null;
  stipend?: number | null;
  financialAid?: boolean;
  selectivity?: string | null;
  focusAreas?: string[];
  isTracked?: boolean;
}

interface TrackedProgram {
  id: string;
  summerProgramId?: string | null;
  applicationYear: number;
  status: string;
  notes?: string | null;
  whyInterested?: string | null;
  isCustom?: boolean;
  customName?: string | null;
  customOrganization?: string | null;
  customDescription?: string | null;
  summerProgram?: SummerProgram | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TABS: { id: OpportunityTab; label: string; icon: React.ElementType }[] = [
  { id: "summer", label: "Summer Programs", icon: Sun },
  { id: "research", label: "Research", icon: FlaskConical },
  { id: "internships", label: "Internships", icon: Briefcase },
  { id: "competitions", label: "Competitions", icon: Trophy },
  { id: "scholarships", label: "Scholarships", icon: GraduationCap },
];

const STATUS_OPTIONS = [
  { value: "interested", label: "Interested", color: "bg-blue-100 text-blue-700" },
  { value: "researching", label: "Researching", color: "bg-purple-100 text-purple-700" },
  { value: "preparing", label: "Preparing", color: "bg-yellow-100 text-yellow-700" },
  { value: "applying", label: "Applying", color: "bg-orange-100 text-orange-700" },
  { value: "applied", label: "Applied", color: "bg-indigo-100 text-indigo-700" },
  { value: "accepted", label: "Accepted", color: "bg-green-100 text-green-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "waitlisted", label: "Waitlisted", color: "bg-amber-100 text-amber-700" },
  { value: "declined", label: "Declined", color: "bg-gray-100 text-gray-700" },
  { value: "attending", label: "Attending", color: "bg-emerald-100 text-emerald-700" },
  { value: "completed", label: "Completed", color: "bg-teal-100 text-teal-700" },
];

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function OpportunitiesPage() {
  const { profile } = useProfile();
  const [activeTab, setActiveTab] = useState<OpportunityTab>("summer");
  const [trackedPrograms, setTrackedPrograms] = useState<TrackedProgram[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState<TrackedProgram | null>(null);

  // Fetch tracked programs
  const fetchTrackedPrograms = useCallback(async () => {
    try {
      const res = await fetch("/api/opportunities/summer-programs");
      if (res.ok) {
        const data = await res.json();
        setTrackedPrograms(data);
      }
    } catch (error) {
      console.error("Error fetching tracked programs:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrackedPrograms();
  }, [fetchTrackedPrograms]);

  // Handle adding a program
  const handleAddProgram = async (programId: string) => {
    try {
      const res = await fetch("/api/opportunities/summer-programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summerProgramId: programId }),
      });

      if (res.ok) {
        await fetchTrackedPrograms();
        setShowAddModal(false);
      }
    } catch (error) {
      console.error("Error adding program:", error);
    }
  };

  // Handle adding a custom program
  const handleAddCustomProgram = async (data: {
    customName: string;
    customOrganization?: string;
    customDescription?: string;
    applicationYear: number;
  }) => {
    const res = await fetch("/api/opportunities/summer-programs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      await fetchTrackedPrograms();
      setShowAddModal(false);
    } else {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to add program");
    }
  };

  // Handle updating status
  const handleUpdateStatus = async (trackedId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/opportunities/summer-programs/${trackedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setTrackedPrograms(prev =>
          prev.map(p => (p.id === trackedId ? { ...p, status: newStatus } : p))
        );
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  // Handle removing a program
  const handleRemoveProgram = async (trackedId: string) => {
    if (!confirm("Remove this program from your list?")) return;

    try {
      const res = await fetch(`/api/opportunities/summer-programs/${trackedId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setTrackedPrograms(prev => prev.filter(p => p.id !== trackedId));
      }
    } catch (error) {
      console.error("Error removing program:", error);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text-main mb-2">
          Opportunities
        </h1>
        <p className="text-text-muted">
          Track summer programs, research, internships, and more.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-secondary rounded-xl mb-8 w-fit overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isComingSoon = tab.id !== "summer";

          return (
            <button
              key={tab.id}
              onClick={() => !isComingSoon && setActiveTab(tab.id)}
              disabled={isComingSoon}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                isActive
                  ? "bg-white text-text-primary shadow-sm"
                  : isComingSoon
                    ? "text-text-light cursor-not-allowed"
                    : "text-text-muted hover:text-text-primary"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {isComingSoon && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === "summer" && (
        <SummerProgramsTab
          programs={trackedPrograms}
          isLoading={isLoading}
          profile={profile}
          onAdd={() => setShowAddModal(true)}
          onUpdateStatus={handleUpdateStatus}
          onRemove={handleRemoveProgram}
          onCheckEligibility={setShowEligibilityModal}
        />
      )}

      {activeTab !== "summer" && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {TABS.find(t => t.id === activeTab)?.icon &&
              React.createElement(TABS.find(t => t.id === activeTab)!.icon, {
                className: "w-8 h-8 text-gray-400",
              })}
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">Coming Soon</h3>
          <p className="text-text-muted">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tracking is coming soon.
          </p>
        </div>
      )}

      {/* Add Program Modal */}
      <AddProgramModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddProgram}
        onAddCustom={handleAddCustomProgram}
      />

      {/* Eligibility Modal */}
      {showEligibilityModal && (
        <EligibilityModal
          program={showEligibilityModal}
          profile={profile}
          onClose={() => setShowEligibilityModal(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// SUMMER PROGRAMS TAB
// =============================================================================

function SummerProgramsTab({
  programs,
  isLoading,
  profile,
  onAdd,
  onUpdateStatus,
  onRemove,
  onCheckEligibility,
}: {
  programs: TrackedProgram[];
  isLoading: boolean;
  profile: ReturnType<typeof useProfile>["profile"];
  onAdd: () => void;
  onUpdateStatus: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  onCheckEligibility: (program: TrackedProgram) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 text-accent-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* Existing programs */}
      {programs.map(tracked => (
        <ProgramCard
          key={tracked.id}
          tracked={tracked}
          profile={profile}
          onUpdateStatus={onUpdateStatus}
          onRemove={onRemove}
          onCheckEligibility={onCheckEligibility}
        />
      ))}

      {/* Add new card */}
      <button
        onClick={onAdd}
        className="group border-2 border-dashed border-border-subtle rounded-[20px] p-6 hover:border-accent-primary hover:bg-accent-surface/30 transition-all min-h-[200px] flex flex-col items-center justify-center gap-3"
      >
        <div className="w-12 h-12 bg-surface-secondary rounded-xl flex items-center justify-center group-hover:bg-accent-surface transition-colors">
          <Plus className="w-6 h-6 text-text-muted group-hover:text-accent-primary transition-colors" />
        </div>
        <div className="text-center">
          <div className="font-medium text-text-primary group-hover:text-accent-primary transition-colors">
            Add Program
          </div>
          <div className="text-sm text-text-muted">
            Track a summer program
          </div>
        </div>
      </button>
    </div>
  );
}

// =============================================================================
// PROGRAM CARD
// =============================================================================

function ProgramCard({
  tracked,
  profile,
  onUpdateStatus,
  onRemove,
  onCheckEligibility,
}: {
  tracked: TrackedProgram;
  profile: ReturnType<typeof useProfile>["profile"];
  onUpdateStatus: (id: string, status: string) => void;
  onRemove: (id: string) => void;
  onCheckEligibility: (program: TrackedProgram) => void;
}) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const program = tracked.summerProgram;
  const isCustom = tracked.isCustom || !program;
  const statusOption = STATUS_OPTIONS.find(s => s.value === tracked.status) || STATUS_OPTIONS[0];

  // Display values - handle both linked and custom programs
  const displayName = isCustom ? tracked.customName : (program?.shortName || program?.name);
  const displayOrg = isCustom ? tracked.customOrganization : program?.organization;
  const websiteUrl = program?.websiteUrl;

  // Calculate eligibility (only for linked programs)
  const eligibility = profile && program
    ? calculateEligibility(profile as Parameters<typeof calculateEligibility>[0], program)
    : null;
  const eligibilityBadge = eligibility ? getEligibilityBadge(eligibility.overall) : null;

  // Format deadline (only for linked programs)
  const deadline = program?.applicationDeadline
    ? new Date(program.applicationDeadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const isDeadlineSoon = program?.applicationDeadline
    ? new Date(program.applicationDeadline).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div className="bg-white border border-border-subtle rounded-[20px] p-5 shadow-card hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        {isCustom ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-text-main truncate">
                {displayName || "Untitled Program"}
              </h3>
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                Custom
              </span>
            </div>
            {displayOrg && (
              <p className="text-sm text-text-muted truncate">{displayOrg}</p>
            )}
          </div>
        ) : (
          <Link href={`/summer-programs/${program!.id}`} className="flex-1 min-w-0 group">
            <h3 className="font-display font-bold text-text-main truncate group-hover:text-accent-primary transition-colors">
              {displayName}
            </h3>
            <p className="text-sm text-text-muted truncate">{displayOrg}</p>
          </Link>
        )}

        {/* Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-surface-secondary rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-text-muted" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white border border-border-subtle rounded-xl shadow-lg z-20 py-1 min-w-[140px]">
                {!isCustom && program && (
                  <Link
                    href={`/summer-programs/${program.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <FileText className="w-4 h-4" />
                    View Details
                  </Link>
                )}
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Visit Website
                  </a>
                )}
                <button
                  onClick={() => {
                    onRemove(tracked.id);
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors w-full"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Status dropdown */}
      <div className="relative mb-3">
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            statusOption.color
          )}
        >
          {statusOption.label}
          <ChevronDown className="w-3 h-3" />
        </button>
        {showStatusDropdown && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowStatusDropdown(false)} />
            <div className="absolute left-0 top-full mt-1 bg-white border border-border-subtle rounded-xl shadow-lg z-20 py-1 min-w-[140px] max-h-[200px] overflow-y-auto">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onUpdateStatus(tracked.id, opt.value);
                    setShowStatusDropdown(false);
                  }}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm w-full transition-colors",
                    tracked.status === opt.value
                      ? "bg-accent-surface text-accent-primary"
                      : "text-text-primary hover:bg-surface-secondary"
                  )}
                >
                  {tracked.status === opt.value && <Check className="w-3 h-3" />}
                  <span className={cn(tracked.status !== opt.value && "ml-5")}>{opt.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm mb-4">
        {deadline && (
          <div className={cn("flex items-center gap-2", isDeadlineSoon && "text-orange-600")}>
            <Calendar className="w-4 h-4 text-text-muted" />
            <span>
              Deadline: <strong>{deadline}</strong>
              {isDeadlineSoon && " (soon!)"}
            </span>
          </div>
        )}
        {program?.location && (
          <div className="flex items-center gap-2 text-text-muted">
            <MapPin className="w-4 h-4" />
            <span>{program.location}</span>
          </div>
        )}
        {program?.duration && (
          <div className="flex items-center gap-2 text-text-muted">
            <Clock className="w-4 h-4" />
            <span>{program.duration}</span>
          </div>
        )}
        {isCustom && tracked.customDescription && (
          <div className="text-text-muted text-xs line-clamp-2">
            {tracked.customDescription}
          </div>
        )}
      </div>

      {/* Eligibility - only show for linked programs */}
      {!isCustom && program && (
        <div className="pt-3 border-t border-border-subtle">
          <button
            onClick={() => onCheckEligibility(tracked)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors w-full justify-center",
              eligibilityBadge?.bgColor || "bg-gray-100",
              eligibilityBadge?.color || "text-gray-700",
              "hover:opacity-80"
            )}
          >
            {eligibility?.overall === "eligible" && <CheckCircle2 className="w-4 h-4" />}
            {eligibility?.overall === "ineligible" && <AlertCircle className="w-4 h-4" />}
            {(eligibility?.overall === "check_required" || eligibility?.overall === "unknown") && (
              <HelpCircle className="w-4 h-4" />
            )}
            {eligibilityBadge?.label || "Check Eligibility"}
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ADD PROGRAM MODAL
// =============================================================================

function AddProgramModal({
  isOpen,
  onClose,
  onAdd,
  onAddCustom,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (programId: string) => void;
  onAddCustom: (data: { customName: string; customOrganization?: string; customDescription?: string; applicationYear: number }) => Promise<void>;
}) {
  // Mode: "search" for database search, "custom" for custom entry
  const [mode, setMode] = useState<"search" | "custom">("search");

  const [searchQuery, setSearchQuery] = useState("");
  const [programs, setPrograms] = useState<SummerProgram[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 1);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Custom program fields
  const [customName, setCustomName] = useState("");
  const [customOrganization, setCustomOrganization] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [isSavingCustom, setIsSavingCustom] = useState(false);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode("search");
      setCustomName("");
      setCustomOrganization("");
      setCustomDescription("");
    }
  }, [isOpen]);

  // Search programs
  const searchPrograms = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        year: selectedYear.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/opportunities/summer-programs/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPrograms(data.programs);
      }
    } catch (error) {
      console.error("Error searching programs:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedYear]);

  // Search on mount and when query/year changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(searchPrograms, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchQuery, selectedYear, searchPrograms]);

  const handleAdd = async (programId: string) => {
    setAddingId(programId);
    await onAdd(programId);
    setAddingId(null);
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) return;

    setIsSavingCustom(true);
    try {
      await onAddCustom({
        customName: customName.trim(),
        customOrganization: customOrganization.trim() || undefined,
        customDescription: customDescription.trim() || undefined,
        applicationYear: selectedYear,
      });
      onClose();
    } catch (error) {
      console.error("Error adding custom program:", error);
    } finally {
      setIsSavingCustom(false);
    }
  };

  const switchToCustomMode = () => {
    setCustomName(searchQuery);
    setMode("custom");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {mode === "custom" && (
                <button
                  onClick={() => setMode("search")}
                  className="p-1.5 -ml-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors"
                >
                  <ChevronDown className="w-5 h-5 rotate-90" />
                </button>
              )}
              <h2 className="text-xl font-semibold text-text-primary">
                {mode === "search" ? "Add Summer Program" : "Add Custom Program"}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>

          {/* Search and year filter (search mode) or Year selector (custom mode) */}
          <div className="flex gap-3">
            {mode === "search" ? (
              <>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search programs..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                  />
                </div>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                </select>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Application Year:</span>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                >
                  <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                  <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === "search" ? (
            <>
              {/* Option to add custom program */}
              <button
                onClick={() => setMode("custom")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-4 border border-dashed border-border-subtle rounded-xl text-sm text-text-muted hover:border-accent-primary hover:text-accent-primary hover:bg-accent-surface/30 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add a program not in our database
              </button>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
                </div>
              ) : programs.length === 0 ? (
                <div className="text-center py-8">
                  {searchQuery ? (
                    <div className="space-y-3">
                      <p className="text-text-muted">
                        No programs found for &quot;{searchQuery}&quot;
                      </p>
                      <button
                        onClick={switchToCustomMode}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent-surface text-accent-primary rounded-lg text-sm font-medium hover:bg-accent-surface/80 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add &quot;{searchQuery}&quot; as custom program
                      </button>
                    </div>
                  ) : (
                    <p className="text-text-muted">Search for programs to add</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {programs.map(program => (
                    <div
                      key={program.id}
                      className={cn(
                        "flex items-center gap-4 p-4 border rounded-xl transition-colors",
                        program.isTracked
                          ? "border-green-200 bg-green-50"
                          : "border-border-subtle hover:border-accent-primary"
                      )}
                    >
                      <Link
                        href={`/summer-programs/${program.id}`}
                        className="flex-1 min-w-0 group"
                        onClick={onClose}
                      >
                        <div className="font-medium text-text-primary truncate group-hover:text-accent-primary transition-colors">
                          {program.shortName ? `${program.shortName} - ${program.name}` : program.name}
                        </div>
                        <div className="text-sm text-text-muted truncate">{program.organization}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                          {program.applicationDeadline && (
                            <span>
                              Deadline:{" "}
                              {new Date(program.applicationDeadline).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          )}
                          {program.selectivity && (
                            <span className="capitalize">{program.selectivity.replace("_", " ")}</span>
                          )}
                        </div>
                      </Link>
                      {program.isTracked ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                          <Check className="w-4 h-4" />
                          Added
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAdd(program.id)}
                          disabled={addingId === program.id}
                        >
                          {addingId === program.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Plus className="w-4 h-4" />
                              Add
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Custom Program Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">
                    Program Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., XYZ Summer Research Program"
                    className="w-full py-2.5 px-4 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">
                    Organization (optional)
                  </label>
                  <input
                    type="text"
                    value={customOrganization}
                    onChange={(e) => setCustomOrganization(e.target.value)}
                    placeholder="e.g., Stanford University"
                    className="w-full py-2.5 px-4 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">
                    Description (optional)
                  </label>
                  <textarea
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    placeholder="Brief description of the program..."
                    rows={3}
                    className="w-full py-2.5 px-4 border border-border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent resize-none"
                  />
                </div>
              </div>

              {/* Info note */}
              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <strong>Note:</strong> Custom programs won&apos;t have detailed eligibility information.
                You can still track your application progress.
              </div>

              {/* Save button */}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setMode("search")}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddCustom}
                  disabled={!customName.trim() || isSavingCustom}
                  className="flex-1"
                >
                  {isSavingCustom ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Program
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ELIGIBILITY MODAL
// =============================================================================

function EligibilityModal({
  program,
  profile,
  onClose,
}: {
  program: TrackedProgram;
  profile: ReturnType<typeof useProfile>["profile"];
  onClose: () => void;
}) {
  const summerProgram = program.summerProgram;
  const eligibility: EligibilityResult | null = profile && summerProgram
    ? calculateEligibility(profile as Parameters<typeof calculateEligibility>[0], summerProgram)
    : null;

  const badge = eligibility ? getEligibilityBadge(eligibility.overall) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {summerProgram?.shortName || summerProgram?.name || program.customName}
              </h2>
              <p className="text-sm text-text-muted">Eligibility Check</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!eligibility ? (
            <div className="text-center text-text-muted py-4">
              Unable to check eligibility. Please ensure your profile is complete.
            </div>
          ) : (
            <>
              {/* Overall status */}
              <div
                className={cn(
                  "flex items-center gap-3 p-4 rounded-xl mb-6",
                  badge?.bgColor
                )}
              >
                {eligibility.overall === "eligible" && <CheckCircle2 className={cn("w-6 h-6", badge?.color)} />}
                {eligibility.overall === "ineligible" && <AlertCircle className={cn("w-6 h-6", badge?.color)} />}
                {(eligibility.overall === "check_required" || eligibility.overall === "unknown") && (
                  <HelpCircle className={cn("w-6 h-6", badge?.color)} />
                )}
                <div>
                  <div className={cn("font-semibold", badge?.color)}>{badge?.label}</div>
                  <div className="text-sm text-text-muted">{eligibility.summary}</div>
                </div>
              </div>

              {/* Individual checks */}
              <div className="space-y-3">
                {eligibility.checks.map((check, i) => {
                  const checkBadge = getEligibilityBadge(check.status);
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 bg-surface-secondary rounded-lg"
                    >
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          checkBadge.bgColor
                        )}
                      >
                        {check.status === "eligible" && (
                          <Check className={cn("w-3 h-3", checkBadge.color)} />
                        )}
                        {check.status === "ineligible" && (
                          <X className={cn("w-3 h-3", checkBadge.color)} />
                        )}
                        {(check.status === "check_required" || check.status === "unknown") && (
                          <HelpCircle className={cn("w-3 h-3", checkBadge.color)} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary text-sm">{check.criterion}</div>
                        <div className="text-sm text-text-muted">{check.message}</div>
                        {check.details && (
                          <div className="text-xs text-text-light mt-1">{check.details}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Program year note */}
              {summerProgram && (
                <div className="mt-6 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <strong>Note:</strong> This eligibility check is for the{" "}
                  <strong>{summerProgram.programYear}</strong> program. Age and grade
                  requirements are calculated based on the program start date.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-subtle">
          <Button className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
