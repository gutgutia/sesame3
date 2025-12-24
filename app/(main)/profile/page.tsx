"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  PenTool, 
  Users, 
  Trophy, 
  FlaskConical,
  ChevronRight,
  MessageCircle,
  Sparkles,
  CheckCircle2,
  Circle,
  User,
  BookOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { calculateGPA, formatGPA } from "@/lib/gpa-calculator";
import { ShareStoryModal } from "@/components/profile";

// =============================================================================
// MAIN PROFILE OVERVIEW PAGE
// =============================================================================

interface StoryData {
  storyEntries: Array<{ id: string; title: string; themes: string[] }>;
}

export default function ProfileOverviewPage() {
  const { profile, isLoading, error, refreshProfile } = useProfile();
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);

  // Fetch story data
  useEffect(() => {
    fetch("/api/profile/stories")
      .then(res => res.ok ? res.json() : null)
      .then(data => setStoryData(data))
      .catch(console.error);
  }, []);

  const storyCount = storyData?.storyEntries?.length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <p className="text-text-muted mb-4">Failed to load profile</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Calculate stats
  const gpaResult = calculateGPA(profile?.courses || []);
  const satScores = profile?.testing?.satScores || [];
  const actScores = profile?.testing?.actScores || [];
  const bestSAT = satScores.length > 0 ? Math.max(...satScores.map(s => s.total)) : null;
  const bestACT = actScores.length > 0 ? Math.max(...actScores.map(s => s.composite)) : null;
  
  const courseCount = profile?.courses?.length || 0;
  const activityCount = profile?.activities?.length || 0;
  const awardCount = profile?.awards?.length || 0;
  const programCount = profile?.programs?.length || 0;

  // Profile completeness
  const completenessItems = [
    { label: "About Me", done: storyCount >= 1 },
    { label: "Courses", done: courseCount >= 5 },
    { label: "Test Scores", done: satScores.length > 0 || actScores.length > 0 },
    { label: "Activities", done: activityCount >= 3 },
    { label: "Awards", done: awardCount >= 1 },
  ];
  const completedCount = completenessItems.filter(i => i.done).length;
  const completenessPercent = Math.round((completedCount / completenessItems.length) * 100);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-text-main mb-2">Your Profile</h1>
          <p className="text-text-muted">Your academic and extracurricular snapshot.</p>
        </div>
      </div>

      {/* Top Row: Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Unweighted GPA" 
          value={formatGPA(gpaResult.unweighted)} 
          subtext={courseCount > 0 ? `from ${courseCount} courses` : undefined}
          accent
        />
        <StatCard 
          label="Weighted GPA" 
          value={formatGPA(gpaResult.weighted)} 
          subtext={gpaResult.apCount > 0 ? `${gpaResult.apCount} AP/IB courses` : undefined}
          accent
        />
        <StatCard 
          label="Best SAT" 
          value={bestSAT?.toString() || "—"} 
          subtext={satScores.length > 0 ? `${satScores.length} attempt${satScores.length > 1 ? "s" : ""}` : undefined}
        />
        <StatCard 
          label="Best ACT" 
          value={bestACT?.toString() || "—"} 
          subtext={actScores.length > 0 ? `${actScores.length} attempt${actScores.length > 1 ? "s" : ""}` : undefined}
        />
      </div>

      {/* About Me + Completeness Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* About Me */}
        <div className="lg:col-span-2">
          <AboutMeCard 
            storyCount={storyCount} 
            themes={storyData?.storyEntries?.flatMap(s => s.themes) || []}
            onAddStory={() => setIsStoryModalOpen(true)} 
          />
        </div>

        {/* Profile Completeness */}
        <div className="bg-white border border-border-subtle rounded-[20px] p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-lg text-text-main">Profile Completeness</h3>
            <span className="text-2xl font-bold text-accent-primary">{completenessPercent}%</span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-bg-sidebar rounded-full mb-5 overflow-hidden">
            <div 
              className="h-full bg-accent-primary rounded-full transition-all duration-500"
              style={{ width: `${completenessPercent}%` }}
            />
          </div>

          <div className="space-y-2.5">
            {completenessItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                {item.done ? (
                  <CheckCircle2 className="w-4 h-4 text-accent-primary" />
                ) : (
                  <Circle className="w-4 h-4 text-border-medium" />
                )}
                <span className={cn(
                  "text-sm",
                  item.done ? "text-text-main" : "text-text-muted"
                )}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SectionCard
          icon={GraduationCap}
          title="Courses"
          description="Your coursework and GPA"
          href="/profile/courses"
          stats={[
            { label: "Courses", value: courseCount },
            { label: "AP/IB", value: gpaResult.apCount },
            { label: "Honors", value: gpaResult.honorsCount },
          ]}
          isEmpty={courseCount === 0}
          emptyMessage="Add your courses to calculate GPA"
        />

        <SectionCard
          icon={PenTool}
          title="Testing"
          description="SAT, ACT, and AP scores"
          href="/profile/testing"
          stats={[
            { label: "SAT", value: satScores.length },
            { label: "ACT", value: actScores.length },
            { label: "AP", value: profile?.testing?.apScores?.length || 0 },
          ]}
          isEmpty={satScores.length === 0 && actScores.length === 0}
          emptyMessage="Add your test scores"
        />

        <SectionCard
          icon={Users}
          title="Activities"
          description="Extracurriculars and involvement"
          href="/profile/activities"
          stats={[
            { label: "Total", value: activityCount },
            { label: "Leadership", value: profile?.activities?.filter(a => a.isLeadership).length || 0 },
            { label: "Spike", value: profile?.activities?.filter(a => a.isSpike).length || 0 },
          ]}
          isEmpty={activityCount === 0}
          emptyMessage="Add your activities"
        />

        <SectionCard
          icon={Trophy}
          title="Awards"
          description="Honors and recognitions"
          href="/profile/awards"
          stats={[
            { label: "Total", value: awardCount },
          ]}
          isEmpty={awardCount === 0}
          emptyMessage="Add your awards"
        />

        <SectionCard
          icon={FlaskConical}
          title="Programs"
          description="Summer programs and research"
          href="/profile/programs"
          stats={[
            { label: "Total", value: programCount },
          ]}
          isEmpty={programCount === 0}
          emptyMessage="Add programs you've done"
        />
      </div>

      {/* Chat Prompt */}
      <div className="mt-8 bg-bg-sidebar/50 border border-border-subtle rounded-xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent-surface text-accent-primary rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-text-main">Need help with your profile?</div>
            <div className="text-sm text-text-muted">Chat with your advisor for personalized guidance</div>
          </div>
        </div>
        <Link href="/advisor?mode=profile">
          <Button variant="secondary">
            <MessageCircle className="w-4 h-4" />
            Chat with Advisor
          </Button>
        </Link>
      </div>

      {/* Share Story Modal */}
      <ShareStoryModal
        isOpen={isStoryModalOpen}
        onClose={() => setIsStoryModalOpen(false)}
        onStorySaved={() => {
          setIsStoryModalOpen(false);
          // Refresh story data
          fetch("/api/profile/stories")
            .then(res => res.ok ? res.json() : null)
            .then(data => setStoryData(data))
            .catch(console.error);
        }}
      />
    </>
  );
}

// =============================================================================
// COMPONENTS
// =============================================================================

function StatCard({ 
  label, 
  value, 
  subtext,
  accent,
}: { 
  label: string; 
  value: string; 
  subtext?: string;
  accent?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-[16px] p-5 border",
      accent 
        ? "bg-accent-surface/50 border-accent-border" 
        : "bg-white border-border-subtle shadow-card"
    )}>
      <div className="text-xs text-text-muted uppercase tracking-wider mb-1">{label}</div>
      <div className={cn(
        "text-3xl font-mono font-bold",
        accent ? "text-accent-primary" : "text-text-main"
      )}>
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-text-muted mt-1">{subtext}</div>
      )}
    </div>
  );
}

// Theme colors for visual variety
const themeColors: Record<string, { bg: string; text: string }> = {
  Identity: { bg: "bg-blue-100", text: "text-blue-700" },
  Passion: { bg: "bg-pink-100", text: "text-pink-700" },
  Challenge: { bg: "bg-orange-100", text: "text-orange-700" },
  Growth: { bg: "bg-green-100", text: "text-green-700" },
  Leadership: { bg: "bg-purple-100", text: "text-purple-700" },
  Family: { bg: "bg-rose-100", text: "text-rose-700" },
  Community: { bg: "bg-teal-100", text: "text-teal-700" },
  Creativity: { bg: "bg-yellow-100", text: "text-yellow-700" },
  Discovery: { bg: "bg-indigo-100", text: "text-indigo-700" },
  Resilience: { bg: "bg-red-100", text: "text-red-700" },
};

function AboutMeCard({ 
  storyCount, 
  themes,
  onAddStory,
}: { 
  storyCount: number;
  themes: string[];
  onAddStory: () => void;
}) {
  // Get unique themes
  const uniqueThemes = Array.from(new Set(themes)).slice(0, 4);

  if (storyCount === 0) {
    return (
      <div className="bg-bg-sidebar border border-border-subtle rounded-[20px] p-6 h-full flex items-center">
        <div className="flex items-center gap-4 w-full">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-text-muted border border-border-subtle shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-lg text-text-main mb-1">Tell us about yourself</h3>
            <p className="text-sm text-text-muted">Beyond grades and scores — who are you?</p>
          </div>
          <Button size="sm" onClick={onAddStory}>
            <Plus className="w-4 h-4" />
            Share a Story
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Link 
      href="/profile/about-me"
      className="block bg-white border border-border-subtle rounded-[20px] p-6 shadow-card h-full hover:border-accent-primary hover:shadow-lg transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-surface rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-text-main">About Me</h3>
            <p className="text-sm text-text-muted">Your story journal</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-light group-hover:text-accent-primary group-hover:translate-x-1 transition-all" />
      </div>
      
      <div className="flex items-center gap-6 mb-4">
        <div>
          <div className="text-3xl font-bold text-text-main">{storyCount}</div>
          <div className="text-xs text-text-muted">Stories shared</div>
        </div>
      </div>

      {uniqueThemes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {uniqueThemes.map((theme) => {
            const colors = themeColors[theme] || { bg: "bg-gray-100", text: "text-gray-700" };
            return (
              <span
                key={theme}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full",
                  colors.bg,
                  colors.text
                )}
              >
                {theme}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  href,
  stats,
  isEmpty,
  emptyMessage,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  stats: Array<{ label: string; value: number }>;
  isEmpty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <Link 
      href={href}
      className="group bg-white border border-border-subtle rounded-[20px] p-6 shadow-card hover:border-accent-primary hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-bg-sidebar rounded-xl flex items-center justify-center text-text-muted group-hover:bg-accent-surface group-hover:text-accent-primary transition-colors">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-text-main">{title}</h3>
            <p className="text-xs text-text-muted">{description}</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-text-light group-hover:text-accent-primary group-hover:translate-x-1 transition-all" />
      </div>

      {isEmpty ? (
        <div className="text-sm text-text-muted py-4 text-center bg-bg-sidebar/50 rounded-xl">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex gap-4">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-xl font-bold text-text-main">{stat.value}</div>
              <div className="text-xs text-text-muted">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}
