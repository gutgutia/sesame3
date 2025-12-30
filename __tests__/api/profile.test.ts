import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  mockPrisma,
  resetPrismaMocks,
  createMockUser,
  createMockProfile,
  createMockFullProfile,
} from "../mocks/prisma";

// Mock the prisma module
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Mock cache invalidation
vi.mock("@/lib/cache/profile-cache", () => ({
  invalidateProfileCache: vi.fn(),
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
import { GET, PUT } from "@/app/api/profile/route";

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

// Helper to setup authenticated user
function setupAuthenticatedUser(userId = "user_123", email = "test@example.com") {
  const token = createSessionToken({ userId, email });

  mockCookies.get.mockImplementation((name: string) => {
    if (name === "sesame_session") return { value: token };
    return undefined;
  });

  mockPrisma.user.findUnique.mockResolvedValue(
    createMockUser({ id: userId, email })
  );
}

describe("GET /api/profile", () => {
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

  it("should return 404 when profile not found", async () => {
    setupAuthenticatedUser();

    // Profile lookup returns null
    mockPrisma.studentProfile.findFirst.mockResolvedValue(null);
    mockPrisma.accessGrant.findFirst.mockResolvedValue(null);

    // When creating new profile
    mockPrisma.user.upsert.mockResolvedValue(createMockUser());
    mockPrisma.studentProfile.create.mockResolvedValue(
      createMockProfile({ id: "new_profile" })
    );

    // But findUnique still returns null (simulating a race condition)
    mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Profile not found");
  });

  it("should return full profile for authenticated user", async () => {
    setupAuthenticatedUser();

    const fullProfile = createMockFullProfile();

    mockPrisma.studentProfile.findFirst.mockResolvedValue(
      createMockProfile({ id: "profile_123" })
    );
    mockPrisma.studentProfile.findUnique.mockResolvedValue(fullProfile);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe("profile_mock123");
    expect(data.firstName).toBe("Test");
    expect(data.lastName).toBe("User");
    expect(data.grade).toBe("11th");
    expect(data.academics).toBeDefined();
    expect(data.testing).toBeDefined();
    expect(data.courses).toHaveLength(1);
    expect(data.activities).toHaveLength(1);
    expect(data.awards).toHaveLength(1);
  });

  it("should include cache headers", async () => {
    setupAuthenticatedUser();

    mockPrisma.studentProfile.findFirst.mockResolvedValue(
      createMockProfile({ id: "profile_123" })
    );
    mockPrisma.studentProfile.findUnique.mockResolvedValue(createMockFullProfile());

    const response = await GET();

    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Cache-Control")).toContain("max-age=30");
  });
});

describe("PUT /api/profile", () => {
  beforeEach(() => {
    resetPrismaMocks();
    mockCookies.get.mockReset();
  });

  it("should return 401 when not authenticated", async () => {
    mockCookies.get.mockReturnValue(undefined);

    const request = new NextRequest("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({ firstName: "Updated" }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Not authenticated");
  });

  it("should update allowed fields", async () => {
    setupAuthenticatedUser();

    mockPrisma.studentProfile.findFirst.mockResolvedValue(
      createMockProfile({ id: "profile_123" })
    );

    const updatedProfile = createMockProfile({
      id: "profile_123",
      firstName: "Updated",
      lastName: "Name",
    });
    mockPrisma.studentProfile.update.mockResolvedValue(updatedProfile);

    const request = new NextRequest("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        firstName: "Updated",
        lastName: "Name",
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.firstName).toBe("Updated");
    expect(data.lastName).toBe("Name");

    // Verify update was called with correct fields
    expect(mockPrisma.studentProfile.update).toHaveBeenCalledWith({
      where: { id: "profile_123" },
      data: {
        firstName: "Updated",
        lastName: "Name",
      },
    });
  });

  it("should ignore non-allowed fields", async () => {
    setupAuthenticatedUser();

    mockPrisma.studentProfile.findFirst.mockResolvedValue(
      createMockProfile({ id: "profile_123" })
    );
    mockPrisma.studentProfile.update.mockResolvedValue(
      createMockProfile({ id: "profile_123" })
    );

    const request = new NextRequest("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        firstName: "Updated",
        id: "hacked_id", // Should be ignored
        userId: "hacked_user", // Should be ignored
        createdAt: "2020-01-01", // Should be ignored
      }),
    });

    await PUT(request);

    // Verify only firstName was in the update
    const updateCall = mockPrisma.studentProfile.update.mock.calls[0][0];
    expect(updateCall.data).toEqual({ firstName: "Updated" });
    expect(updateCall.data.id).toBeUndefined();
    expect(updateCall.data.userId).toBeUndefined();
    expect(updateCall.data.createdAt).toBeUndefined();
  });

  it("should convert birthDate string to Date", async () => {
    setupAuthenticatedUser();

    mockPrisma.studentProfile.findFirst.mockResolvedValue(
      createMockProfile({ id: "profile_123" })
    );
    mockPrisma.studentProfile.update.mockResolvedValue(
      createMockProfile({ id: "profile_123" })
    );

    const request = new NextRequest("http://localhost/api/profile", {
      method: "PUT",
      body: JSON.stringify({
        birthDate: "2008-05-15",
      }),
    });

    await PUT(request);

    const updateCall = mockPrisma.studentProfile.update.mock.calls[0][0];
    expect(updateCall.data.birthDate).toBeInstanceOf(Date);
  });
});
