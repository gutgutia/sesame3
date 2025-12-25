import { vi } from "vitest";

// Mock auth functions
export const mockRequireProfile = vi.fn();
export const mockGetCurrentUser = vi.fn();

// Helper to reset mocks
export function resetAuthMocks() {
  mockRequireProfile.mockReset();
  mockGetCurrentUser.mockReset();
}

// Helper to set up authenticated user
export function setupAuthenticatedUser(profileId = "profile_mock123") {
  mockRequireProfile.mockResolvedValue(profileId);
}

// Helper to set up unauthenticated state
export function setupUnauthenticated() {
  mockRequireProfile.mockRejectedValue(new Error("Profile not found"));
}
