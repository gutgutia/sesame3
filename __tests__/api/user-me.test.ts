import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockPrisma, resetPrismaMocks, createMockUser } from "../mocks/prisma";

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
import { GET } from "@/app/api/user/me/route";

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
    expiresAt: Date.now() + 1000 * 60 * 60,
    ...overrides,
  };
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

describe("GET /api/user/me", () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockCookies.get.mockReset();
  });

  it("should return 401 when not authenticated", async () => {
    mockCookies.get.mockReturnValue(undefined);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Not authenticated");
  });

  it("should return user info for authenticated non-admin user", async () => {
    const token = createSessionToken({
      userId: "user_123",
      email: "regular@example.com",
    });

    mockCookies.get.mockImplementation((name: string) => {
      if (name === "sesame_session") return { value: token };
      return undefined;
    });

    mockPrisma.user.findUnique.mockResolvedValue(
      createMockUser({
        id: "user_123",
        email: "regular@example.com",
        name: "Regular User",
      })
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("user_123");
    expect(data.email).toBe("regular@example.com");
    expect(data.name).toBe("Regular User");
    expect(data.isAdmin).toBe(false);
  });

  it("should return isAdmin=true for admin user", async () => {
    const token = createSessionToken({
      userId: "user_admin",
      email: "abhishek.gutgutia@gmail.com",
    });

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

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe("abhishek.gutgutia@gmail.com");
    expect(data.isAdmin).toBe(true);
  });

  it("should handle user without name", async () => {
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
        name: null,
      })
    );

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBeUndefined();
  });
});
