"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";

interface PostHogContextType {
  posthog: typeof posthog | null;
  isReady: boolean;
}

const PostHogContext = createContext<PostHogContextType>({
  posthog: null,
  isReady: false,
});

/**
 * PostHog Provider - Lazy loads PostHog for product analytics
 *
 * Features:
 * - Lazy initialization (doesn't block page load)
 * - Automatic pageview tracking
 * - User identification when profile loads
 * - Disabled in development by default
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  // Check if already initialized on mount (handles React strict mode / hot reload)
  const [isReady, setIsReady] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!posthog.__loaded;
  });
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog
  useEffect(() => {
    // Already initialized (strict mode, hot reload, etc.)
    if (posthog.__loaded) return;

    const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    // Don't initialize without API key
    if (!apiKey) {
      if (process.env.NODE_ENV === "development") {
        console.log("[PostHog] No API key found, skipping initialization");
      }
      return;
    }

    posthog.init(apiKey, {
      api_host: apiHost,
      // Performance optimizations
      autocapture: false, // Disable autocapture - we'll track events manually
      capture_pageview: false, // We handle pageviews manually for SPA
      capture_pageleave: true, // Track when users leave
      disable_session_recording: false, // Enable session replay
      // Session replay settings (sample to reduce volume)
      session_recording: {
        maskAllInputs: true, // Privacy: mask form inputs
        maskTextSelector: "[data-mask]", // Additional masking
      },
      // Reduce network requests
      request_batching: true,
      // Respect Do Not Track
      respect_dnt: true,
      // Don't persist across subdomains
      cross_subdomain_cookie: false,
      // Load lazily
      loaded: () => {
        setIsReady(true);
        if (process.env.NODE_ENV === "development") {
          console.log("[PostHog] Initialized");
        }
      },
    });
  }, []);

  // Track pageviews on route change
  useEffect(() => {
    if (!isReady || !pathname) return;

    // Build URL with search params
    let url = pathname;
    if (searchParams?.toString()) {
      url += `?${searchParams.toString()}`;
    }

    posthog.capture("$pageview", {
      $current_url: url,
    });
  }, [pathname, searchParams, isReady]);

  return (
    <PostHogContext.Provider value={{ posthog: isReady ? posthog : null, isReady }}>
      {children}
    </PostHogContext.Provider>
  );
}

/**
 * Hook to access PostHog instance
 */
export function usePostHog() {
  return useContext(PostHogContext);
}

/**
 * Identify a user in PostHog
 * Call this when user logs in or profile loads
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (!posthog.__loaded) return;

  posthog.identify(userId, properties);
}

/**
 * Reset user identity (call on logout)
 */
export function resetUser() {
  if (!posthog.__loaded) return;

  posthog.reset();
}

/**
 * Track a custom event
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!posthog.__loaded) return;

  posthog.capture(eventName, properties);
}
