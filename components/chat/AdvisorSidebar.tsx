"use client";

import React, { useEffect, useState } from "react";
import {
  Target,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

type AdvisorContext = {
  objectives: string[];
  deadlines: Array<{
    label: string;
    daysUntil: number;
    priority: string;
    type: string;
  }>;
  commitments: string[];
  sessionInfo: {
    daysSinceLastSession: number | null;
    totalConversations: number;
  };
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function AdvisorSidebar() {
  const [context, setContext] = useState<AdvisorContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadContext = async () => {
      try {
        const res = await fetch("/api/advisor/context");
        if (res.ok) {
          const data = await res.json();
          setContext(data);
        }
      } catch (error) {
        console.error("Failed to load advisor context:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContext();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="p-4 text-center text-text-muted">
        Unable to load context
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Session Objectives */}
      {context.objectives.length > 0 && (
        <ObjectivesSection objectives={context.objectives} />
      )}

      {/* Upcoming Deadlines */}
      {context.deadlines.length > 0 && (
        <DeadlinesSection deadlines={context.deadlines} />
      )}

      {/* Open Commitments */}
      {context.commitments.length > 0 && (
        <CommitmentsSection commitments={context.commitments} />
      )}

      {/* Session Info (subtle footer) */}
      <SessionInfo info={context.sessionInfo} />
    </div>
  );
}

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

function ObjectivesSection({ objectives }: { objectives: string[] }) {
  return (
    <SidebarSection title="Today's Focus" icon={Target}>
      <ul className="space-y-2">
        {objectives.map((objective, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-text-secondary"
          >
            <span className="w-5 h-5 bg-accent-surface text-accent-primary rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="leading-snug">{objective}</span>
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

function DeadlinesSection({
  deadlines,
}: {
  deadlines: AdvisorContext["deadlines"];
}) {
  return (
    <SidebarSection title="Upcoming Deadlines" icon={Clock}>
      <ul className="space-y-2">
        {deadlines.map((deadline, i) => (
          <li
            key={i}
            className={cn(
              "flex items-center justify-between text-sm p-2 rounded-lg",
              deadline.priority === "urgent"
                ? "bg-red-50 text-red-700"
                : deadline.priority === "soon"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-surface-secondary text-text-secondary"
            )}
          >
            <span className="flex items-center gap-2">
              {deadline.priority === "urgent" && (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span className="truncate max-w-[180px]">{deadline.label}</span>
            </span>
            <span className="font-medium text-xs whitespace-nowrap">
              {deadline.daysUntil === 0
                ? "Today"
                : deadline.daysUntil === 1
                  ? "Tomorrow"
                  : `${deadline.daysUntil}d`}
            </span>
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

function CommitmentsSection({ commitments }: { commitments: string[] }) {
  return (
    <SidebarSection title="Open Commitments" icon={CheckCircle2}>
      <ul className="space-y-2">
        {commitments.map((commitment, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-text-secondary"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent-primary mt-2 flex-shrink-0" />
            <span className="leading-snug">{commitment}</span>
          </li>
        ))}
      </ul>
    </SidebarSection>
  );
}

function SessionInfo({
  info,
}: {
  info: AdvisorContext["sessionInfo"];
}) {
  if (info.totalConversations === 0 && info.daysSinceLastSession === null) {
    return null;
  }

  return (
    <div className="mt-auto pt-4 border-t border-border-subtle">
      <p className="text-xs text-text-muted text-center">
        {info.daysSinceLastSession !== null ? (
          info.daysSinceLastSession === 0 ? (
            "Last chat: earlier today"
          ) : info.daysSinceLastSession === 1 ? (
            "Last chat: yesterday"
          ) : (
            `Last chat: ${info.daysSinceLastSession} days ago`
          )
        ) : (
          "Welcome to your first session!"
        )}
        {info.totalConversations > 0 && (
          <span className="mx-1">•</span>
        )}
        {info.totalConversations > 0 && (
          `${info.totalConversations} total session${info.totalConversations === 1 ? "" : "s"}`
        )}
      </p>
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function SidebarSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-text-muted" />
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
      </div>
      {children}
    </div>
  );
}

