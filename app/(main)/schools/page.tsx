"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Plus, 
  MessageCircle, 
  Sparkles,
  TrendingUp,
  School,
  Trash2,
  Heart,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { AddSchoolModal } from "@/components/schools";
import { SchoolLogo } from "@/components/ui/SchoolLogo";

// =============================================================================
// TYPES
// =============================================================================

interface StudentSchool {
  id: string;
  tier: string;
  isDream: boolean;
  status: string | null;
  interestLevel: string | null;
  isCustom?: boolean;
  customName?: string | null;
  customLocation?: string | null;
  school?: {
    id: string;
    name: string;
    shortName?: string | null;
    city?: string | null;
    state?: string | null;
    acceptanceRate?: number | null;
    satRange25?: number | null;
    satRange75?: number | null;
    websiteUrl?: string | null;
  } | null;
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SchoolsPage() {
  const { profile, isLoading, isFullyLoaded, refreshProfile } = useProfile();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Extract schools from profile
  const schools: StudentSchool[] = (profile?.schoolList || []).map(s => ({
    id: s.id,
    tier: s.tier || "reach",
    isDream: s.isDream || false,
    status: s.status || null,
    interestLevel: s.interestLevel || null,
    isCustom: s.isCustom || false,
    customName: s.customName || null,
    customLocation: s.customLocation || null,
    school: s.school || null,
  }));

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this school from your list?")) return;
    await fetch(`/api/profile/schools?id=${id}`, { method: "DELETE" });
    refreshProfile();
  };

  // Group by tier - memoized to avoid re-filtering on every render
  const { reachSchools, targetSchools, safetySchools, dreamSchools } = useMemo(() => ({
    reachSchools: schools.filter(s => s.tier === "reach"),
    targetSchools: schools.filter(s => s.tier === "target"),
    safetySchools: schools.filter(s => s.tier === "safety"),
    dreamSchools: schools.filter(s => s.isDream),
  }), [schools]);

  // Show loading if initial load OR if empty schools and profile not fully loaded yet
  // (handles the progressive loading case where summary loads first without schoolList)
  if (isLoading || (schools.length === 0 && !isFullyLoaded)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-text-main mb-2">Your Schools</h1>
          <p className="text-text-muted">Build and balance your college list.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/advisor?mode=chances">
            <Button variant="secondary">
              <TrendingUp className="w-4 h-4" />
              Check Chances
            </Button>
          </Link>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add School
          </Button>
        </div>
      </div>

      {schools.length === 0 ? (
        /* Empty State */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white border border-border-subtle rounded-[20px] p-12 text-center shadow-card">
              <div className="w-16 h-16 bg-accent-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                <School className="w-8 h-8 text-accent-primary" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">No schools yet</h2>
              <p className="text-text-muted mb-6 max-w-md mx-auto">
                Start building your college list with reaches, targets, and safeties.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setIsAddModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Your First School
                </Button>
                <Link href="/advisor?mode=schools">
                  <Button variant="secondary">
                    <MessageCircle className="w-4 h-4" />
                    Get Recommendations
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <AdvisorCTA />
          </div>
        </div>
      ) : (
        /* Schools Grid */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Balance Overview */}
            <div className="bg-white border border-border-subtle rounded-[20px] p-5 shadow-card">
              <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent-primary" />
                List Balance
              </h3>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 bg-pink-50 rounded-xl">
                  <div className="text-2xl font-bold text-pink-600">{dreamSchools.length}</div>
                  <div className="text-xs text-pink-600 font-medium flex items-center justify-center gap-1">
                    <Heart className="w-3 h-3 fill-current" /> Dream
                  </div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-600">{reachSchools.length}</div>
                  <div className="text-xs text-red-600 font-medium">Reach</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-600">{targetSchools.length}</div>
                  <div className="text-xs text-amber-600 font-medium">Target</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{safetySchools.length}</div>
                  <div className="text-xs text-green-600 font-medium">Safety</div>
                </div>
              </div>
            </div>

            {/* School Sections */}
            {reachSchools.length > 0 && (
              <SchoolSection 
                title="Reach" 
                color="red"
                schools={reachSchools} 
                onDelete={handleDelete}
              />
            )}

            {targetSchools.length > 0 && (
              <SchoolSection 
                title="Target" 
                color="amber"
                schools={targetSchools} 
                onDelete={handleDelete}
              />
            )}

            {safetySchools.length > 0 && (
              <SchoolSection 
                title="Safety" 
                color="green"
                schools={safetySchools} 
                onDelete={handleDelete}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-5">
            {/* Quick Stats */}
            <div className="bg-white border border-border-subtle rounded-[20px] p-5 shadow-card">
              <h3 className="font-display font-bold text-text-main mb-4">Your List</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Schools</span>
                  <span className="font-bold text-text-main">{schools.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Dream Schools</span>
                  <span className="font-bold text-pink-600">{dreamSchools.length}</span>
                </div>
                <div className="h-px bg-border-subtle my-2" />
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Reach</span>
                  <span className="text-red-600">{reachSchools.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Target</span>
                  <span className="text-amber-600">{targetSchools.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-muted">Safety</span>
                  <span className="text-green-600">{safetySchools.length}</span>
                </div>
              </div>
            </div>

            {/* Advisor CTA */}
            <AdvisorCTA />
          </div>
        </div>
      )}

      {/* Add School Modal */}
      <AddSchoolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSchoolAdded={() => {
          setIsAddModalOpen(false);
          refreshProfile();
        }}
      />
    </>
  );
}

// =============================================================================
// COMPONENTS
// =============================================================================

function SchoolSection({ 
  title, 
  color, 
  schools, 
  onDelete 
}: { 
  title: string; 
  color: "red" | "amber" | "green";
  schools: StudentSchool[]; 
  onDelete: (id: string) => void;
}) {
  const headerColors = {
    red: "text-red-600",
    amber: "text-amber-600",
    green: "text-green-600",
  };

  const cardColors = {
    red: "border-red-100 hover:border-red-200",
    amber: "border-amber-100 hover:border-amber-200",
    green: "border-green-100 hover:border-green-200",
  };

  return (
    <div>
      <h2 className={cn("font-display font-bold text-lg mb-4", headerColors[color])}>
        {title} ({schools.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schools.map(school => (
          <SchoolCard
            key={school.id}
            school={school}
            colorClass={cardColors[color]}
            onDelete={() => onDelete(school.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SchoolCard({
  school,
  colorClass,
  onDelete,
}: {
  school: StudentSchool;
  colorClass: string;
  onDelete: () => void;
}) {
  // Determine display values for both linked and custom schools
  const displayName = school.isCustom
    ? school.customName
    : school.school?.shortName || school.school?.name;
  const displayLocation = school.isCustom
    ? school.customLocation
    : school.school?.city && school.school?.state
      ? `${school.school.city}, ${school.school.state}`
      : null;
  const websiteUrl = school.school?.websiteUrl;
  const acceptanceRate = school.school?.acceptanceRate;
  const satRange25 = school.school?.satRange25;
  const satRange75 = school.school?.satRange75;

  return (
    <div className={cn(
      "bg-white border rounded-xl p-4 transition-all hover:shadow-card group relative",
      colorClass
    )}>
      {/* Clickable overlay for navigation */}
      <Link href={`/schools/${school.id}`} className="absolute inset-0 z-0" />

      <div className="flex items-start gap-3 relative z-10 pointer-events-none">
        <SchoolLogo
          name={displayName || "School"}
          shortName={school.school?.shortName}
          websiteUrl={websiteUrl}
          size="lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-text-main truncate">
              {displayName || "Unknown School"}
            </h3>
            {school.isDream && (
              <Heart className="w-4 h-4 text-pink-500 fill-current shrink-0" />
            )}
            {school.isCustom && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                Custom
              </span>
            )}
          </div>
          {displayLocation && (
            <div className="text-sm text-text-muted">
              {displayLocation}
            </div>
          )}
          {acceptanceRate && (
            <div className="text-xs text-text-muted mt-1">
              {Math.round(acceptanceRate * 100)}% acceptance
              {satRange25 && satRange75 && (
                <span className="ml-2">
                  • SAT {satRange25}–{satRange75}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* View details hint */}
      <div className="absolute bottom-2 right-3 text-xs text-text-light opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        View details <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}

function AdvisorCTA() {
  return (
    <Link 
      href="/advisor?mode=schools"
      className="block bg-accent-surface/50 border border-accent-border rounded-[20px] p-5 hover:bg-accent-surface transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-accent-primary" />
        </div>
        <div className="font-display font-bold text-text-main">Need help?</div>
      </div>
      <p className="text-sm text-text-muted mb-4">
        Get personalized school recommendations based on your profile.
      </p>
      <div className="flex items-center gap-2 text-sm font-medium text-accent-primary group-hover:gap-3 transition-all">
        <MessageCircle className="w-4 h-4" />
        Chat with Advisor
        <ChevronRight className="w-4 h-4" />
      </div>
    </Link>
  );
}
