import { vi } from "vitest";

// Create mock Prisma client
export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  studentProfile: {
    findUnique: vi.fn(),
  },
  usageRecord: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
  },
  globalConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

// Helper to reset all mocks
export function resetPrismaMocks() {
  vi.clearAllMocks();
}

// Helper to create mock user
export function createMockUser(overrides = {}) {
  return {
    id: "user_mock123",
    email: "test@example.com",
    subscriptionTier: "free",
    subscriptionEndsAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    overrideDailyCostLimit: null,
    overrideWeeklyCostLimit: null,
    overrideMessageLimit: null,
    isAdmin: false,
    ...overrides,
  };
}

// Helper to create mock profile
export function createMockProfile(overrides = {}) {
  return {
    id: "profile_mock123",
    userId: "user_mock123",
    user: createMockUser(),
    ...overrides,
  };
}

// Helper to create mock usage record
export function createMockUsageRecord(overrides = {}) {
  return {
    id: "usage_mock123",
    userId: "user_mock123",
    date: new Date(),
    messageCount: 0,
    tokensInput: 0,
    tokensOutput: 0,
    costAdvisor: 0,
    costParser: 0,
    costOther: 0,
    costTotal: 0,
    modelUsage: {},
    ...overrides,
  };
}

// Helper to create mock global config
export function createMockGlobalConfig(overrides = {}) {
  return {
    id: "default",
    freeDailyCostLimit: 0.1,
    freeWeeklyCostLimit: 0.5,
    freeMessageLimit: 20,
    standardDailyCostLimit: 1.0,
    standardWeeklyCostLimit: 5.0,
    standardMessageLimit: 100,
    premiumDailyCostLimit: 5.0,
    premiumWeeklyCostLimit: 25.0,
    premiumMessageLimit: 500,
    ...overrides,
  };
}
