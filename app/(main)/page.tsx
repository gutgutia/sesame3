"use client";

import React from "react";
import {
  Coffee,
  Target,
  Sparkles,
  TrendingUp,
  GraduationCap,
  Calendar,
  School,
  ChevronRight,
  Plus,
  Check,
  MessageCircle,
  Smile,
} from "lucide-react";
import { ZenInput } from "@/components/dashboard/ZenInput";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useProfile, ProfileData } from "@/lib/context/ProfileContext";

// =============================================================================
// TYPES
// =============================================================================

// ProfileData is now imported from ProfileContext

type DashboardZone = 0 | 1 | 2 | 3;

interface ZoneStatus {
  zone: DashboardZone;
  hasSchools: boolean;
  hasProfile: boolean;
  hasGoals: boolean;
  hasStory: boolean;
}

// =============================================================================
// ZONE CALCULATION
// =============================================================================

function calculateZone(profile: ProfileData | null): ZoneStatus {
  if (!profile) {
    return { zone: 0, hasSchools: false, hasProfile: false, hasGoals: false, hasStory: false };
  }

  const hasSchools = (profile.schoolList?.length ?? 0) > 0;
  const hasAcademics = !!(
    profile.academics?.gpaUnweighted ||
    profile.academics?.gpaWeighted ||
    profile.testing?.satScores?.[0]?.total ||
    profile.testing?.actScores?.[0]?.composite
  );
  const hasActivities = (profile.activities?.length ?? 0) > 0;
  const hasProfile = hasAcademics || hasActivities || (profile.awards?.length ?? 0) > 0;
  const hasGoals = (profile.goals?.length ?? 0) > 0;
  // Story is now tracked via storyEntries - this is a simplified check
  const hasStory = false; // Will be updated when we fetch storyEntries separately

  const filledAreas = [hasSchools, hasProfile, hasGoals].filter(Boolean).length;

  let zone: DashboardZone = 0;
  if (filledAreas >= 3) zone = 3;
  else if (filledAreas >= 2) zone = 2;
  else if (filledAreas >= 1) zone = 1;

  return { zone, hasSchools, hasProfile, hasGoals, hasStory };
}

// =============================================================================
// HELPERS
// =============================================================================

function getTimeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getEncouragingMessage(zone: DashboardZone): string {
  if (zone === 0) return "Let's get started. One thing at a time.";
  if (zone === 1) return "You're making progress. Keep building.";
  if (zone === 2) return "Almost there. You're doing great.";
  return "You've got this. Let's keep the momentum.";
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function DashboardPage() {
  // Use global profile context instead of fetching per-page
  const { profile, isLoading, error } = useProfile();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <p className="text-text-muted mb-4">Failed to load profile</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  const zoneStatus = calculateZone(profile);
  const userName = profile?.preferredName || profile?.firstName || "there";
  const greeting = getTimeOfDayGreeting();
  const encouragement = getEncouragingMessage(zoneStatus.zone);
  const { zone, hasSchools, hasProfile, hasGoals, hasStory } = zoneStatus;

  // ========== ZONE 0: Empty - Full CTAs ==========
  if (zone === 0) {
    return (
      <>
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-text-main mb-2">
            Welcome{userName !== "there" ? `, ${userName}` : ""}.
          </h1>
          <p className="text-text-muted text-base md:text-lg">
            Let's set you up for success.
          </p>
        </div>

        <ZenInput />

        {/* PRIMARY CTA: Tell Us About You */}
        <div className="bg-gradient-to-br from-accent-surface to-white border border-accent-border rounded-[20px] p-8 shadow-float mb-6 relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-16 h-16 bg-white text-accent-primary rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-accent-border">
              <Smile className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold text-accent-primary uppercase tracking-wider mb-2">
                Let's Connect
              </div>
              <h2 className="font-display font-bold text-2xl mb-2 text-text-main">
                I'd love to get to know you
              </h2>
              <p className="text-text-muted mb-4 max-w-lg">
                Beyond grades and scores — tell me about who you are, what you
                care about, and what makes you unique.
              </p>
              <Link href="/advisor?mode=onboarding">
                <Button>
                  <MessageCircle className="w-4 h-4" />
                  Let's Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* More ways to get started */}
        <div className="mb-8">
          <div className="text-xs font-bold text-text-light uppercase tracking-wider mb-4">
            More ways to get started
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CTACard
              href="/advisor?mode=profile"
              icon={GraduationCap}
              title="Build Profile"
              description="Add your GPA, test scores, activities, and awards."
            />
            <CTACard
              href="/advisor?mode=chances"
              icon={TrendingUp}
              title="Check Chances"
              description="See how you stack up at dream schools."
            />
            <CTACard
              href="/advisor?mode=schools"
              icon={School}
              title="Build School List"
              description="Add schools, get suggestions, balance your list."
            />
          </div>
        </div>
      </>
    );
  }

  // ========== ZONE 1-2: Building profile ==========
  if (zone === 1 || zone === 2) {
    return (
      <>
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-text-main mb-2">
            {greeting}, {userName}.
          </h1>
          <p className="text-text-muted text-base md:text-lg">{encouragement}</p>
        </div>

        <ZenInput />

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 mb-8">
          <div className="flex flex-col gap-6">
            {/* Schools */}
            {hasSchools ? (
              <FilledSchoolsCard schoolList={profile?.schoolList || []} />
            ) : (
              <MiniCTACard
                href="/advisor?mode=schools"
                icon={School}
                title="Build Your School List"
                description="Add schools to start seeing match analysis."
              />
            )}

            {/* Profile */}
            {hasProfile ? (
              <FilledProfileCard profile={profile} />
            ) : (
              <MiniCTACard
                href="/advisor?mode=profile"
                icon={GraduationCap}
                title="Build Your Profile"
                description="Add GPA, test scores, and activities."
              />
            )}

            {/* Goals */}
            {hasGoals ? (
              <FilledGoalsCard goals={profile?.goals || []} />
            ) : (
              <MiniCTACard
                href="/advisor?mode=planning"
                icon={Calendar}
                title="Set Your Goals"
                description="Plan your path to success."
              />
            )}
          </div>

          {/* Right sidebar */}
          <div className="flex flex-col gap-6">
            {!hasStory && (
              <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Smile className="w-4 h-4 text-accent-primary" />
                  <span className="text-xs font-bold text-accent-primary uppercase tracking-wider">
                    Get Personal
                  </span>
                </div>
                <p className="text-sm text-text-main mb-4">
                  Beyond the numbers — tell me who you really are.
                </p>
                <Link href="/advisor?mode=story">
                  <Button size="sm">
                    <MessageCircle className="w-4 h-4" />
                    Tell Me About Yourself
                  </Button>
                </Link>
              </div>
            )}

            {/* Progress */}
            <div className="bg-bg-sidebar rounded-xl p-5">
              <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
                Setup Progress
              </div>
              <div className="space-y-2">
                <ProgressItem label="Your Story" done={hasStory} />
                <ProgressItem label="School List" done={hasSchools} />
                <ProgressItem label="Profile" done={hasProfile} />
                <ProgressItem label="Goals" done={hasGoals} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ========== ZONE 3: Full Dashboard ==========
  return (
    <>
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl md:text-4xl text-text-main mb-2">
          {greeting}, {userName}.
        </h1>
        <p className="text-text-muted text-base md:text-lg">{encouragement}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-primary" />
          <span className="text-sm font-medium text-text-muted">
            Ask your advisor anything
          </span>
        </div>
        <ZenInput />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
        <div className="flex flex-col gap-6">
          <FilledSchoolsCard schoolList={profile?.schoolList || []} />
          <FilledProfileCard profile={profile} />
          <FilledGoalsCard goals={profile?.goals || []} />
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-primary" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <Link
                href="/advisor?mode=chances"
                className="block p-3 bg-bg-sidebar rounded-lg hover:bg-accent-surface transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-accent-primary" />
                  <span className="text-sm font-medium">Check Chances</span>
                </div>
              </Link>
              <Link
                href="/advisor"
                className="block p-3 bg-bg-sidebar rounded-lg hover:bg-accent-surface transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-5 h-5 text-accent-primary" />
                  <span className="text-sm font-medium">Chat with Advisor</span>
                </div>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-8 text-center text-text-light text-[13px] flex items-center justify-center gap-2">
        <Coffee className="w-4 h-4" />
        <span>Remember to take breaks. You've got this.</span>
      </div>
    </>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function CTACard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="group">
      <div className="bg-white border border-border-subtle rounded-xl p-5 h-full hover:border-accent-primary hover:shadow-card transition-all">
        <div className="w-10 h-10 bg-bg-sidebar text-text-muted rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-surface group-hover:text-accent-primary transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="font-display font-bold text-lg mb-1">{title}</h3>
        <p className="text-sm text-text-muted">{description}</p>
      </div>
    </Link>
  );
}

function MiniCTACard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="group">
      <div className="bg-white border border-border-subtle rounded-xl p-5 hover:border-accent-primary hover:shadow-card transition-all flex items-center gap-4">
        <div className="w-12 h-12 bg-bg-sidebar text-text-muted rounded-xl flex items-center justify-center group-hover:bg-accent-surface group-hover:text-accent-primary transition-colors shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-lg mb-0.5">{title}</h3>
          <p className="text-sm text-text-muted">{description}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-primary transition-colors" />
      </div>
    </Link>
  );
}

function FilledSchoolsCard({
  schoolList,
}: {
  schoolList: NonNullable<ProfileData["schoolList"]>;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <School className="w-5 h-5 text-accent-primary" />
          Your Schools
        </h3>
        <Link href="/schools" className="text-sm text-accent-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {schoolList.slice(0, 4).map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-2 bg-bg-sidebar rounded-lg">
            <div className="w-8 h-8 bg-accent-surface text-accent-primary rounded-lg flex items-center justify-center text-sm font-bold">
              {item.school?.name?.charAt(0) ?? "?"}
            </div>
            <span className="font-medium text-sm flex-1">{item.school?.name ?? "Unknown"}</span>
            {item.tier && (
              <span className="text-xs bg-bg-sidebar text-text-muted px-2 py-0.5 rounded-full capitalize">
                {item.tier}
              </span>
            )}
          </div>
        ))}
        {schoolList.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">No schools added yet</p>
        )}
      </div>
    </Card>
  );
}

function FilledProfileCard({ profile }: { profile: ProfileData | null }) {
  if (!profile) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-accent-primary" />
          Your Profile
        </h3>
        <Link href="/profile" className="text-sm text-accent-primary hover:underline">
          View full
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {profile.academics?.gpaUnweighted && (
          <div className="bg-bg-sidebar rounded-lg p-3">
            <div className="text-xs text-text-muted">GPA</div>
            <div className="font-mono font-bold text-lg">{profile.academics.gpaUnweighted}</div>
          </div>
        )}
        {profile.testing?.satScores?.[0]?.total && (
          <div className="bg-bg-sidebar rounded-lg p-3">
            <div className="text-xs text-text-muted">SAT</div>
            <div className="font-mono font-bold text-lg">{profile.testing.satScores[0].total}</div>
          </div>
        )}
        {profile.testing?.actScores?.[0]?.composite && (
          <div className="bg-bg-sidebar rounded-lg p-3">
            <div className="text-xs text-text-muted">ACT</div>
            <div className="font-mono font-bold text-lg">{profile.testing.actScores[0].composite}</div>
          </div>
        )}
        {(profile.activities?.length ?? 0) > 0 && (
          <div className="bg-bg-sidebar rounded-lg p-3">
            <div className="text-xs text-text-muted">Activities</div>
            <div className="font-mono font-bold text-lg">{profile.activities?.length}</div>
          </div>
        )}
        {(profile.awards?.length ?? 0) > 0 && (
          <div className="bg-bg-sidebar rounded-lg p-3">
            <div className="text-xs text-text-muted">Awards</div>
            <div className="font-mono font-bold text-lg">{profile.awards?.length}</div>
          </div>
        )}
      </div>
    </Card>
  );
}

function FilledGoalsCard({ goals }: { goals: NonNullable<ProfileData["goals"]> }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-accent-primary" />
          Your Goals
        </h3>
        <Link href="/plan" className="text-sm text-accent-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {goals.slice(0, 3).map((goal) => (
          <div key={goal.id} className="flex items-center gap-3 p-2 bg-bg-sidebar rounded-lg">
            <div className="w-8 h-8 bg-accent-surface text-accent-primary rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <span className="font-medium text-sm flex-1 truncate">{goal.title}</span>
            <span className="text-xs text-text-muted capitalize">{(goal.status ?? "planning").replace("_", " ")}</span>
          </div>
        ))}
        {goals.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4">No goals set yet</p>
        )}
      </div>
    </Card>
  );
}

function ProgressItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center ${
          done ? "bg-success-bg text-success-text" : "bg-border-medium text-white"
        }`}
      >
        {done ? <Check className="w-3 h-3" /> : <span className="w-2 h-2 bg-white rounded-full" />}
      </div>
      <span className={`text-sm ${done ? "text-text-main" : "text-text-muted"}`}>{label}</span>
    </div>
  );
}
