import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetPrismaMocks, createMockUser } from "../mocks/prisma";

// Mock the prisma and auth modules
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
import { ADMIN_EMAILS, requireAdmin, isAdmin } from "@/lib/admin";

describe("Admin Module", () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockCookies.get.mockReset();
  });

  describe("ADMIN_EMAILS", () => {
    it("should be an array", () => {
      expect(Array.isArray(ADMIN_EMAILS)).toBe(true);
    });

    it("should contain the main admin email", () => {
      expect(ADMIN_EMAILS).toContain("abhishek.gutgutia@gmail.com");
    });
  });

  describe("isAdmin", () => {
    it("should return false when no user is authenticated", async () => {
      mockCookies.get.mockReturnValue(undefined);

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it("should return false for non-admin user", async () => {
      // Create a valid session token
      const session = {
        userId: "user_123",
        email: "regular@example.com",
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour from now
      };
      const token = Buffer.from(JSON.stringify(session)).toString("base64");

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ email: "regular@example.com" })
      );

      const result = await isAdmin();

      expect(result).toBe(false);
    });

    it("should return true for admin user", async () => {
      // Create a valid session token
      const session = {
        userId: "user_admin",
        email: "abhishek.gutgutia@gmail.com",
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60,
      };
      const token = Buffer.from(JSON.stringify(session)).toString("base64");

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({
          id: "user_admin",
          email: "abhishek.gutgutia@gmail.com"
        })
      );

      const result = await isAdmin();

      expect(result).toBe(true);
    });

    it("should handle errors gracefully and return false", async () => {
      mockCookies.get.mockImplementation(() => {
        throw new Error("Cookie error");
      });

      const result = await isAdmin();

      expect(result).toBe(false);
    });
  });

  describe("requireAdmin", () => {
    it("should throw for unauthenticated user", async () => {
      mockCookies.get.mockReturnValue(undefined);

      await expect(requireAdmin()).rejects.toThrow("Unauthorized");
    });

    it("should throw for non-admin user", async () => {
      const session = {
        userId: "user_123",
        email: "regular@example.com",
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60,
      };
      const token = Buffer.from(JSON.stringify(session)).toString("base64");

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({ email: "regular@example.com" })
      );

      await expect(requireAdmin()).rejects.toThrow("Unauthorized");
    });

    it("should return user for admin", async () => {
      const session = {
        userId: "user_admin",
        email: "abhishek.gutgutia@gmail.com",
        createdAt: Date.now(),
        expiresAt: Date.now() + 1000 * 60 * 60,
      };
      const token = Buffer.from(JSON.stringify(session)).toString("base64");

      mockCookies.get.mockImplementation((name: string) => {
        if (name === "sesame_session") return { value: token };
        return undefined;
      });

      mockPrisma.user.findUnique.mockResolvedValue(
        createMockUser({
          id: "user_admin",
          email: "abhishek.gutgutia@gmail.com",
          name: "Admin User",
        })
      );

      const result = await requireAdmin();

      expect(result).toEqual({
        id: "user_admin",
        email: "abhishek.gutgutia@gmail.com",
        name: "Admin User",
      });
    });
  });
});
