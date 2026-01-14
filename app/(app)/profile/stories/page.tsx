"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  User,
  ChevronLeft,
  Plus,
  Trash2,
  Calendar,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ShareStoryModal } from "@/components/profile";

interface StoryEntry {
  id: string;
  title: string;
  summary: string;
  themes: string[];
  contentType: string;
  capturedAt: string;
  rawContent: string;
}

interface AboutMeData {
  id: string;
  values: string[];
  interests: string[];
  personality: string | null;
  background: string | null;
  aspirations: string | null;
  storyEntries: StoryEntry[];
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

// Simple client-side cache
const storiesCache: { data: AboutMeData | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};
const CACHE_TTL = 60000; // 1 minute

export default function AboutMePage() {
  const [aboutMe, setAboutMe] = useState<AboutMeData | null>(() => {
    if (storiesCache.data && Date.now() - storiesCache.timestamp < CACHE_TTL) {
      return storiesCache.data;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    return !(storiesCache.data && Date.now() - storiesCache.timestamp < CACHE_TTL);
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const fetchInProgress = useRef(false);

  const fetchAboutMe = useCallback(async (force = false) => {
    // Skip if already fetching
    if (fetchInProgress.current && !force) return;

    // Skip if cache is fresh
    if (!force && storiesCache.data && Date.now() - storiesCache.timestamp < CACHE_TTL) {
      setAboutMe(storiesCache.data);
      setIsLoading(false);
      return;
    }

    fetchInProgress.current = true;
    try {
      const res = await fetch("/api/profile/stories");
      if (res.ok) {
        const data = await res.json();
        setAboutMe(data);
        storiesCache.data = data;
        storiesCache.timestamp = Date.now();
      }
    } catch (error) {
      console.error("Error fetching about me:", error);
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    fetchAboutMe();
  }, [fetchAboutMe]);

  const handleDeleteStory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this story?")) return;

    await fetch(`/api/profile/stories/${id}`, { method: "DELETE" });
    fetchAboutMe(true); // Force refresh after delete
  };

  const handleStorySaved = () => {
    fetchAboutMe(true); // Force refresh after save
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const stories = aboutMe?.storyEntries || [];

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Profile
        </Link>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-surface rounded-xl flex items-center justify-center text-accent-primary">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-text-main">Stories</h1>
              <p className="text-text-muted">Your personal story journal</p>
            </div>
          </div>

          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Share a Story
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-bg-sidebar rounded-full" />
              <div className="h-4 w-32 bg-bg-sidebar rounded" />
            </div>
          </div>
        ) : stories.length === 0 ? (
          /* Empty State */
          <div className="bg-white border border-border-subtle rounded-[20px] p-12 text-center shadow-card">
            <div className="w-16 h-16 mx-auto mb-4 bg-accent-surface rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-accent-primary" />
            </div>
            <h3 className="text-lg font-semibold text-text-main mb-2">
              Your Story Awaits
            </h3>
            <p className="text-text-muted mb-6 max-w-md mx-auto">
              Share your experiences, passions, and what makes you unique. Each story helps build a richer picture of who you are for your college applications.
            </p>
            <Button onClick={() => setIsModalOpen(true)}>
              <Sparkles className="w-4 h-4" />
              Share Your First Story
            </Button>
          </div>
        ) : (
          /* Story List */
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="bg-white border border-border-subtle rounded-[20px] p-6 shadow-card mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-muted">Stories shared</p>
                  <p className="text-3xl font-bold text-text-main">{stories.length}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {/* Unique themes across all stories */}
                  {Array.from(new Set(stories.flatMap((s) => s.themes)))
                    .slice(0, 5)
                    .map((theme) => {
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
              </div>
            </div>

            {/* Story Cards */}
            {stories.map((story) => (
              <div
                key={story.id}
                className="bg-white border border-border-subtle rounded-[20px] overflow-hidden shadow-card hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-text-main mb-1">
                        {story.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-text-muted">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(story.capturedAt)}</span>
                        <span className="text-border-medium">•</span>
                        <span className="capitalize">{story.contentType}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteStory(story.id)}
                      className="p-2 -m-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary */}
                  <p className="text-text-main mb-4">{story.summary}</p>

                  {/* Themes */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {story.themes.map((theme) => {
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

                  {/* Expand/Collapse Raw Content */}
                  <button
                    onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                    className="text-sm text-accent-primary hover:text-accent-primary/80 font-medium"
                  >
                    {expandedStory === story.id ? "Hide original" : "Show original"}
                  </button>

                  {/* Expanded Content */}
                  {expandedStory === story.id && (
                    <div className="mt-4 p-4 bg-bg-sidebar rounded-xl">
                      <p className="text-sm text-text-muted whitespace-pre-wrap">
                        {story.rawContent}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Share Story Modal */}
      <ShareStoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStorySaved={handleStorySaved}
      />
    </>
  );
}

