/**
 * In-memory cache for assembled advisor context
 * Pre-warmed on login to eliminate cold-start latency in chat
 */

import type { AssembledContext } from "@/lib/ai/context/assembler";

type CachedContext = {
  context: AssembledContext;
  cachedAt: number;
};

// Cache with TTL of 10 minutes (context changes less frequently than profile)
const CACHE_TTL_MS = 10 * 60 * 1000;

// In-memory store
const contextCache = new Map<string, CachedContext>();

/**
 * Get cached context for a profile
 */
export function getCachedContext(profileId: string): AssembledContext | null {
  const cached = contextCache.get(profileId);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    contextCache.delete(profileId);
    return null;
  }

  return cached.context;
}

/**
 * Cache assembled context
 */
export function setCachedContext(
  profileId: string,
  context: AssembledContext
): void {
  contextCache.set(profileId, {
    context,
    cachedAt: Date.now(),
  });
}

/**
 * Invalidate cache for a profile (call after profile updates)
 */
export function invalidateContextCache(profileId: string): void {
  contextCache.delete(profileId);
}

/**
 * Clear all cache
 */
export function clearContextCache(): void {
  contextCache.clear();
}
