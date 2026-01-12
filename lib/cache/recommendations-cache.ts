/**
 * In-memory cache for recommendations
 * Reduces database queries on repeat page visits
 */

type CachedRecommendations = {
  data: {
    recommendations: unknown[];
    stage: unknown;
    lastGenerated: string | null;
  };
  cachedAt: number;
};

// Cache with TTL of 5 minutes (recommendations change infrequently)
const CACHE_TTL_MS = 5 * 60 * 1000;

// In-memory store
const recommendationsCache = new Map<string, CachedRecommendations>();

/**
 * Get cached recommendations for a profile
 */
export function getCachedRecommendations(profileId: string): CachedRecommendations["data"] | null {
  const cached = recommendationsCache.get(profileId);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    recommendationsCache.delete(profileId);
    return null;
  }

  return cached.data;
}

/**
 * Cache recommendations for a profile
 */
export function setCachedRecommendations(
  profileId: string,
  data: CachedRecommendations["data"]
): void {
  recommendationsCache.set(profileId, {
    data,
    cachedAt: Date.now(),
  });
}

/**
 * Invalidate cache for a profile (call after generating new recommendations)
 */
export function invalidateRecommendationsCache(profileId: string): void {
  recommendationsCache.delete(profileId);
}

/**
 * Clear all cache
 */
export function clearRecommendationsCache(): void {
  recommendationsCache.clear();
}
