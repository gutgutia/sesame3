import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockPrisma,
  resetPrismaMocks,
  createMockUser,
  createMockProfile,
} from "../mocks/prisma";

// Mock the prisma module
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock cookies
const mockCookies = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve(mockCookies),
}));

// Import after mocking
import {
  getCurrentUser,
  getCurrentProfileId,
  requireAuth,
  requireProfile,
  clearAuthCookies,
} from "@/lib/auth";

// Helper to create a valid session token
function createSessionToken(overrides: Partial<{
  userId: string;
  email: string;
  createdAt: number;
  expiresAt: number;
}> = {}): string {
  const session = {
    userId: "user_123",
    email: "test@example.com",
    createdAt: Date.now(),
    expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour from now
    ...overrides,
  };
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

describe("Auth Helpers", () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockCookies.get.mockReset();
    mockCookies.set.mockReset();
    mockCookies.delete.mockReset();
  });

  describe("getCurrentUser", () => {
    it("should return null when no session cookie exists", async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("should return null for expired session", async () => {
      const expiredToken = createSessionToken({
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: expiredToken };
        return undefined;
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("should return null for malformed session token", async () => {
      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: "not-valid-base64!@#$" };
        return undefined;
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it("should return user when found by session userId", async () => {
      const token = createSessionToken({
        userId: "user_123",
        email: "test@example.com",
      });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({
          id: "user_123",
          email: "test@example.com",
          name: "Test User",
        })
      );

      const result = await getCurrentUser();

      expect(result).toEqual({
        id: "user_123",
        email: "test@example.com",
        name: "Test User",
      });

      // Verify it looked up by ID first
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user_123" },
        select: { id: true, email: true, name: true },
      });
    });

    it("should fallback to email lookup when user ID not found", async () => {
      const token = createSessionToken({
        userId: "old_user_id",
        email: "test@example.com",
      });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      // First call (by ID) returns null, second call (by email) returns user
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // ID lookup fails
        .mockResolvedValueOnce(
          createMockUser({
            id: "new_user_id",
            email: "test@example.com",
            name: "Reseeded User",
          })
        );

      const result = await getCurrentUser();

      expect(result).toEqual({
        id: "new_user_id",
        email: "test@example.com",
        name: "Reseeded User",
      });

      // Verify both lookups were made
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: "old_user_id" },
        select: { id: true, email: true, name: true },
      });
      expect(mockPrisma.user.findUnique).toHaveBeenNthCalledWith(2, {
        where: { email: "test@example.com" },
        select: { id: true, email: true, name: true },
      });
    });

    it("should use user ID cookie as fallback", async () => {
      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return undefined;
        if (name === "sesame_user_id") return { value: "fallback_user_id" };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({
          id: "fallback_user_id",
          email: "fallback@example.com",
        })
      );

      const result = await getCurrentUser();

      expect(result).toEqual({
        id: "fallback_user_id",
        email: "fallback@example.com",
        name: undefined,
      });
    });

    it("should return null when user not in database", async () => {
      const token = createSessionToken({ userId: "nonexistent_user" });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe("getCurrentProfileId", () => {
    it("should return null when user not authenticated", async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await getCurrentProfileId();

      expect(result).toBeNull();
    });

    it("should return profile ID when user has a profile", async () => {
      const token = createSessionToken({ userId: "user_123" });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ id: "user_123" })
      );

      mockPrisma.studentProfile.findFirst.mockResolvedValue(
        createMockProfile({ id: "profile_123", userId: "user_123" })
      );

      const result = await getCurrentProfileId();

      expect(result).toBe("profile_123");
    });

    it("should check for shared access when no own profile", async () => {
      const token = createSessionToken({ userId: "viewer_user" });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ id: "viewer_user" })
      );

      // No own profile
      mockPrisma.studentProfile.findFirst.mockResolvedValue(null);

      // Has access grant
      mockPrisma.accessGrant = {
        ...mockPrisma.accessGrant,
        findFirst: vi.fn().mockResolvedValue({
          studentProfileId: "shared_profile_123",
        }),
      };

      const result = await getCurrentProfileId();

      expect(result).toBe("shared_profile_123");
    });
  });

  describe("requireAuth", () => {
    it("should throw when not authenticated", async () => {
      mockCookies.get.mockReturnValue(undefined);

      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });

    it("should return user when authenticated", async () => {
      const token = createSessionToken({ userId: "user_123" });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({
          id: "user_123",
          email: "test@example.com",
        })
      );

      const result = await requireAuth();

      expect(result.id).toBe("user_123");
      expect(result.email).toBe("test@example.com");
    });
  });

  describe("requireProfile", () => {
    it("should throw when no profile found", async () => {
      mockCookies.get.mockReturnValue(undefined);

      await expect(requireProfile()).rejects.toThrow("Profile not found");
    });

    it("should return profile ID when profile exists", async () => {
      const token = createSessionToken({ userId: "user_123" });

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ id: "user_123" })
      );

      mockPrisma.studentProfile.findFirst.mockResolvedValue(
        createMockProfile({ id: "profile_123" })
      );

      const result = await requireProfile();

      expect(result).toBe("profile_123");
    });
  });

  describe("clearAuthCookies", () => {
    it("should delete both session cookies", async () => {
      await clearAuthCookies();

      expect(mockCookies.delete).toHaveBeenCalledTimes(2);
      expect(mockCookies.delete).toHaveBeenCalledWith("sesame_session");
      expect(mockCookies.delete).toHaveBeenCalledWith("sesame_user_id");
    });
  });
});
