// =============================================================================
// CONTEXT ASSEMBLER
// =============================================================================

/**
 * Assembles all context components into complete prompts.
 * This is the main entry point for building AI prompts.
 */

import { prisma } from "@/lib/db";
import { buildAdvisorPrompt } from "../prompts/advisor-prompt";
import { buildParserPrompt } from "../prompts/parser-prompt";
import { buildProfileNarrative } from "./profile-narrative";
import { buildEntryContext, EntryMode } from "./entry-context";
import { buildConversationState, Message } from "./conversation-state";
import { buildConversationSummary } from "./conversation-summary";
import { buildCounselorObjectives } from "./counselor-objectives";

// =============================================================================
// TYPES
// =============================================================================

export type AssembleContextParams = {
  profileId: string;
  mode: EntryMode;
  messages: Message[];
  initialQuery?: string;
  sessionStartTime?: Date;
  dataConfirmed?: string[];
  dataPending?: string[];
  isNewUser?: boolean;
  daysSinceLastSession?: number;
};

export type AssembledContext = {
  advisorPrompt: string;
  parserPrompt: string;
  profileNarrative: string;
  // Expose individual components for debugging/logging
  components: {
    profileNarrative: string;
    conversationSummary: string;
    entryContext: string;
    counselorObjectives: string;
    conversationState: string;
  };
};

// =============================================================================
// MAIN ASSEMBLER
// =============================================================================

/**
 * Assembles all context for a chat request.
 * Returns both Advisor (Opus) and Parser (Kimi) prompts.
 */
export async function assembleContext(
  params: AssembleContextParams
): Promise<AssembledContext> {
  const {
    profileId,
    mode,
    messages,
    initialQuery,
    sessionStartTime,
    dataConfirmed,
    dataPending,
    isNewUser,
    daysSinceLastSession,
  } = params;
  
  // Load full profile from database
  const profile = await loadFullProfile(profileId);
  
  // Build each context component
  const [
    profileNarrative,
    conversationSummary,
    counselorObjectives,
  ] = await Promise.all([
    // Sync generators
    Promise.resolve(buildProfileNarrative(profile)),
    // Async generators (stubs for now)
    buildConversationSummary({ profileId }),
    buildCounselorObjectives(profileId, profile),
  ]);
  
  const entryContext = buildEntryContext({
    mode,
    initialQuery,
    isNewUser,
    daysSinceLastSession,
  });
  
  const conversationState = buildConversationState({
    messages,
    sessionStartTime,
    dataConfirmed,
    dataPending,
  });
  
  // Build the prompts
  const advisorPrompt = buildAdvisorPrompt({
    profileNarrative,
    conversationSummary,
    entryContext,
    counselorObjectives,
    conversationState,
  });
  
  const parserPrompt = buildParserPrompt({
    studentName: profile?.preferredName || profile?.firstName,
    grade: profile?.grade || undefined,
    entryPoint: mode,
  });
  
  return {
    advisorPrompt,
    parserPrompt,
    profileNarrative,
    components: {
      profileNarrative,
      conversationSummary,
      entryContext,
      counselorObjectives,
      conversationState,
    },
  };
}

// =============================================================================
// HELPER: LOAD FULL PROFILE
// =============================================================================

async function loadFullProfile(profileId: string) {
  return prisma.studentProfile.findUnique({
    where: { id: profileId },
    include: {
      aboutMe: {
        include: {
          storyEntries: {
            orderBy: { capturedAt: "desc" },
            take: 5,
          },
        },
      },
      academics: true,
      testing: {
        include: {
          satScores: true,
          actScores: true,
          apScores: true,
          subjectTests: true,
        },
      },
      activities: {
        orderBy: { displayOrder: "asc" },
        take: 10,
      },
      awards: {
        orderBy: { displayOrder: "asc" },
        take: 5,
      },
      courses: {
        orderBy: [
          { status: "asc" },
          { academicYear: "desc" },
        ],
        take: 15,
      },
      programs: {
        orderBy: { year: "desc" },
        take: 5,
      },
      goals: {
        include: { tasks: true },
        orderBy: { displayOrder: "asc" },
        take: 10,
      },
      schoolList: {
        include: { school: true },
        orderBy: { displayOrder: "asc" },
        take: 10,
      },
    },
  });
}

// =============================================================================
// QUICK ASSEMBLER (for simpler use cases)
// =============================================================================

/**
 * Simplified assembler that takes fewer params.
 * Good for initial implementation before full context tracking.
 */
export async function assembleContextSimple(
  profileId: string,
  mode: EntryMode,
  messages: Message[]
): Promise<string> {
  const context = await assembleContext({
    profileId,
    mode,
    messages,
    sessionStartTime: new Date(),
  });
  
  return context.advisorPrompt;
}
