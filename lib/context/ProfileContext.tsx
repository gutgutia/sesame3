"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

/**
 * Profile data structure (matches API response)
 */
export interface ProfileData {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  preferredName?: string | null;
  grade?: string | null;
  graduationYear?: number | null;
  highSchoolName?: string | null;
  highSchoolCity?: string | null;
  highSchoolState?: string | null;
  highSchoolType?: string | null;
  birthDate?: string | null;
  residencyStatus?: string | null;
  aboutMe?: {
    story?: string | null;
    values?: string[];
    interests?: string[];
    personality?: string | null;
    background?: string | null;
    aspirations?: string | null;
  } | null;
  academics?: {
    gpaUnweighted?: number | null;
    gpaWeighted?: number | null;
    gpaScale?: number | null;
    classRank?: number | null;
    classSize?: number | null;
    apCourseCount?: number | null;
    honorsCourseCount?: number | null;
  } | null;
  testing?: {
    psatTotal?: number | null;
    psatMath?: number | null;
    psatReading?: number | null;
    psatDate?: string | null;
    nmsqtQualified?: boolean | null;
    satScores?: Array<{
      id: string;
      total: number;
      math: number;
      reading: number;
      essay?: number | null;
      testDate: string;
      isPrimary?: boolean;
      isSuperscored?: boolean;
    }>;
    actScores?: Array<{
      id: string;
      composite: number;
      english: number;
      math: number;
      reading: number;
      science: number;
      writing?: number | null;
      testDate: string;
      isPrimary?: boolean;
      isSuperscored?: boolean;
    }>;
    apScores?: Array<{ id: string; subject: string; score: number; year: number }>;
    subjectTests?: Array<{ id: string; subject: string; score: number; testDate?: string | null }>;
  } | null;
  activities?: Array<{
    id: string;
    title: string;
    organization?: string | null;
    category?: string | null;
    description?: string | null;
    isLeadership?: boolean;
    isSpike?: boolean;
    hoursPerWeek?: number | null;
    weeksPerYear?: number | null;
    yearsActive?: string | null;
    startGrade?: string | null;
    endGrade?: string | null;
  }>;
  awards?: Array<{
    id: string;
    title: string;
    organization?: string | null;
    level?: string | null;
    year?: number | null;
  }>;
  courses?: Array<{
    id: string;
    name: string;
    subject?: string | null;
    level?: string | null;
    status?: string | null;
    grade?: string | null;
    gradeLevel?: string | null;
    academicYear?: string | null;
    semester?: string | null;
    credits?: number | null;
  }>;
  programs?: Array<{
    id: string;
    name: string;
    organization?: string | null;
    type?: string | null;
    status?: string | null;
    year?: number | null;
    selectivity?: string | null;
    description?: string | null;
    url?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    duration?: string | null;
  }>;
  goals?: Array<{
    id: string;
    title: string;
    description?: string | null;
    category?: string | null;
    status?: string | null;
    priority?: string | null;
    targetDate?: string | null;
    tasks?: Array<{
      id: string;
      title: string;
      description?: string | null;
      status?: string | null;
      completed: boolean;
      dueDate?: string | null;
      startDate?: string | null;
      priority?: string | null;
      subtasks?: Array<{
        id: string;
        title: string;
        description?: string | null;
        status?: string | null;
        completed: boolean;
        dueDate?: string | null;
        startDate?: string | null;
        priority?: string | null;
      }>;
    }>;
  }>;
  schoolList?: Array<{
    id: string;
    tier?: string | null;
    isDream?: boolean;
    status?: string | null;
    interestLevel?: string | null;
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
  }>;
}

interface ProfileContextType {
  profile: ProfileData | null;
  isLoading: boolean;
  isFullyLoaded: boolean; // True when full profile (not just summary) is loaded
  error: string | null;
  refreshProfile: (showLoading?: boolean) => Promise<void>;
  updateProfile: (updates: Partial<ProfileData>) => void;
  // Optimistic update helpers
  toggleTask: (goalId: string, taskId: string, completed: boolean) => void;
  addTask: (goalId: string, task: NonNullable<NonNullable<ProfileData["goals"]>[number]["tasks"]>[number]) => void;
  addSubtask: (goalId: string, parentTaskId: string, subtask: NonNullable<NonNullable<NonNullable<ProfileData["goals"]>[number]["tasks"]>[number]["subtasks"]>[number]) => void;
  addGoal: (goal: NonNullable<ProfileData["goals"]>[number]) => void;
  addSchool: (school: NonNullable<ProfileData["schoolList"]>[number]) => void;
  addProgram: (program: NonNullable<ProfileData["programs"]>[number]) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

/**
 * ProfileProvider - Loads and caches profile data for the entire app
 * 
 * Benefits:
 * - Single fetch on app load instead of per-page
 * - Instant page navigation (no loading states)
 * - Consistent data across all components
 */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullyLoaded, setIsFullyLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch full profile from API
  const fetchFullProfile = useCallback(async () => {
    try {
      const startTime = Date.now();
      const response = await fetch("/api/profile");

      if (!response.ok) {
        if (response.status === 401) {
          setProfile(null);
          return;
        }
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      setProfile(data);
      setIsFullyLoaded(true);

      console.log(`[ProfileContext] Full profile loaded in ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error("[ProfileContext] Error loading full profile:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  // Progressive loading: fetch summary first, then full profile
  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const startTime = Date.now();

      // Step 1: Fetch lightweight summary first (fast ~200ms)
      const summaryResponse = await fetch("/api/profile/summary");

      if (!summaryResponse.ok) {
        if (summaryResponse.status === 401) {
          setProfile(null);
          setIsLoading(false);
          return;
        }
        // If summary fails, fall back to full profile
        await fetchFullProfile();
        setIsLoading(false);
        return;
      }

      const summary = await summaryResponse.json();

      // Set minimal profile data for fast initial render
      setProfile({
        id: summary.id,
        firstName: summary.firstName,
        lastName: summary.lastName,
        preferredName: summary.preferredName,
        grade: summary.grade,
        graduationYear: summary.graduationYear,
        highSchoolName: summary.highSchoolName,
        // Initialize empty arrays - will be populated by full load
        courses: [],
        activities: [],
        awards: [],
        goals: [],
        schoolList: [],
      });

      console.log(`[ProfileContext] Summary loaded in ${Date.now() - startTime}ms`);

      // Mark as not loading so UI can render immediately
      setIsLoading(false);

      // Step 2: Fetch full profile in background
      fetchFullProfile();
    } catch (err) {
      console.error("[ProfileContext] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }, [fetchFullProfile]);

  // Load profile on mount
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Refresh profile (call after updates) - background refresh without loading state
  const refreshProfile = useCallback(async (showLoading = false) => {
    if (showLoading) {
      await fetchProfile();
    } else {
      // Background refresh - don't show loading state
      try {
        const response = await fetch("/api/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
        }
      } catch (err) {
        console.error("[ProfileContext] Background refresh error:", err);
      }
    }
  }, [fetchProfile]);

  // Optimistic update (update local state immediately)
  const updateProfile = useCallback((updates: Partial<ProfileData>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  // Optimistic task toggle
  const toggleTask = useCallback((goalId: string, taskId: string, completed: boolean) => {
    setProfile(prev => {
      if (!prev?.goals) return prev;
      return {
        ...prev,
        goals: prev.goals.map(goal => {
          if (goal.id !== goalId) return goal;
          return {
            ...goal,
            tasks: goal.tasks?.map(task => {
              if (task.id === taskId) {
                return { ...task, completed, status: completed ? "completed" : "pending" };
              }
              // Check subtasks
              return {
                ...task,
                subtasks: task.subtasks?.map(st => 
                  st.id === taskId ? { ...st, completed, status: completed ? "completed" : "pending" } : st
                ),
              };
            }),
          };
        }),
      };
    });
  }, []);

  // Optimistic add task
  const addTask = useCallback((goalId: string, task: NonNullable<NonNullable<ProfileData["goals"]>[number]["tasks"]>[number]) => {
    setProfile(prev => {
      if (!prev?.goals) return prev;
      return {
        ...prev,
        goals: prev.goals.map(goal => {
          if (goal.id !== goalId) return goal;
          return {
            ...goal,
            tasks: [...(goal.tasks || []), task],
          };
        }),
      };
    });
  }, []);

  // Optimistic add subtask
  const addSubtask = useCallback((goalId: string, parentTaskId: string, subtask: NonNullable<NonNullable<NonNullable<ProfileData["goals"]>[number]["tasks"]>[number]["subtasks"]>[number]) => {
    setProfile(prev => {
      if (!prev?.goals) return prev;
      return {
        ...prev,
        goals: prev.goals.map(goal => {
          if (goal.id !== goalId) return goal;
          return {
            ...goal,
            tasks: goal.tasks?.map(task => {
              if (task.id !== parentTaskId) return task;
              return {
                ...task,
                subtasks: [...(task.subtasks || []), subtask],
              };
            }),
          };
        }),
      };
    });
  }, []);

  // Optimistic add goal
  const addGoal = useCallback((goal: NonNullable<ProfileData["goals"]>[number]) => {
    setProfile(prev => prev ? { ...prev, goals: [...(prev.goals || []), goal] } : null);
  }, []);

  // Optimistic add school
  const addSchool = useCallback((school: NonNullable<ProfileData["schoolList"]>[number]) => {
    setProfile(prev => {
      if (!prev) return null;
      // Check if school already exists (by school.id)
      const exists = prev.schoolList?.some(s => s.school?.id === school.school?.id);
      if (exists) return prev;
      return { ...prev, schoolList: [...(prev.schoolList || []), school] };
    });
  }, []);

  // Optimistic add program
  const addProgram = useCallback((program: NonNullable<ProfileData["programs"]>[number]) => {
    setProfile(prev => prev ? { ...prev, programs: [...(prev.programs || []), program] } : null);
  }, []);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        isFullyLoaded,
        error,
        refreshProfile,
        updateProfile,
        toggleTask,
        addTask,
        addSubtask,
        addGoal,
        addSchool,
        addProgram,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * Hook to access profile data
 */
export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

/**
 * Hook to get specific profile sections with loading state
 */
export function useProfileSection<K extends keyof ProfileData>(section: K) {
  const { profile, isLoading } = useProfile();
  return {
    data: profile?.[section] ?? null,
    isLoading,
  };
}
