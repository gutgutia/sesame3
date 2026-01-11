import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockPrisma,
  resetPrismaMocks,
  createMockUser,
  createMockUsageRecord,
  createMockGlobalConfig,
} from "../mocks/prisma";

// Mock the prisma module
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import {
  calculateCost,
  recordUsage,
  checkUsage,
  getAdvisorModelForTier,
  invalidateConfigCache,
} from "@/lib/usage";

describe("Usage Tracking", () => {
  beforeEach(() => {
    resetPrismaMocks();
    invalidateConfigCache(); // Clear cached config between tests
  });

  describe("calculateCost", () => {
    it("should calculate cost for haiku model correctly", () => {
      // Haiku: $0.25/1M input, $1.25/1M output
      const cost = calculateCost("haiku", 1_000_000, 1_000_000);
      expect(cost).toBe(0.25 + 1.25); // $1.50
    });

    it("should calculate cost for sonnet model correctly", () => {
      // Sonnet: $3.00/1M input, $15.00/1M output
      const cost = calculateCost("sonnet", 1_000_000, 1_000_000);
      expect(cost).toBe(3.0 + 15.0); // $18.00
    });

    it("should calculate cost for opus model correctly", () => {
      // Opus: $15.00/1M input, $75.00/1M output
      const cost = calculateCost("opus", 1_000_000, 1_000_000);
      expect(cost).toBe(15.0 + 75.0); // $90.00
    });

    it("should calculate cost for kimi_k2 model correctly", () => {
      // Kimi K2: $0.15/1M input, $0.40/1M output
      const cost = calculateCost("kimi_k2", 1_000_000, 1_000_000);
      expect(cost).toBe(0.15 + 0.4); // $0.55
    });

    it("should calculate partial token costs correctly", () => {
      // 500k tokens = half the cost
      const cost = calculateCost("haiku", 500_000, 500_000);
      expect(cost).toBe((0.25 + 1.25) / 2); // $0.75
    });

    it("should return 0 for 0 tokens", () => {
      const cost = calculateCost("haiku", 0, 0);
      expect(cost).toBe(0);
    });
  });

  describe("getAdvisorModelForTier", () => {
    it("should return kimi_k2 for free tier", () => {
      expect(getAdvisorModelForTier("free")).toBe("kimi_k2");
    });

    it("should return opus for paid tier", () => {
      expect(getAdvisorModelForTier("paid")).toBe("opus");
    });
  });

  describe("recordUsage", () => {
    it("should upsert usage record for advisor model", async () => {
      mockPrisma.usageRecord.upsert.mockResolvedValue(createMockUsageRecord());

      await recordUsage({
        userId: "user_123",
        model: "sonnet",
        tokensInput: 1000,
        tokensOutput: 500,
        messageCount: 1,
      });

      expect(mockPrisma.usageRecord.upsert).toHaveBeenCalledTimes(1);
      const call = mockPrisma.usageRecord.upsert.mock.calls[0][0];

      // Check the upsert was called with correct structure
      expect(call.where.userId_date.userId).toBe("user_123");
      expect(call.create.userId).toBe("user_123");
      expect(call.create.tokensInput).toBe(1000);
      expect(call.create.tokensOutput).toBe(500);
      expect(call.create.messageCount).toBe(1);
    });

    it("should categorize parser costs separately", async () => {
      mockPrisma.usageRecord.upsert.mockResolvedValue(createMockUsageRecord());

      await recordUsage({
        userId: "user_123",
        model: "kimi_k2",
        tokensInput: 1000,
        tokensOutput: 500,
      });

      const call = mockPrisma.usageRecord.upsert.mock.calls[0][0];
      // Parser costs should be in costParser field
      expect(call.create.costParser).toBeDefined();
      expect(call.create.costParser).toBeGreaterThan(0);
    });
  });

  describe("checkUsage", () => {
    it("should return allowed=false if user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await checkUsage("nonexistent_user");

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe("User not found");
    });

    it("should return allowed=true for user under limits", async () => {
      const user = createMockUser({ subscriptionTier: "free" });
      const config = createMockGlobalConfig();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(null); // No usage today
      mockPrisma.usageRecord.findMany.mockResolvedValue([]); // No weekly usage

      const result = await checkUsage("user_123");

      expect(result.allowed).toBe(true);
      expect(result.usage.dailyCost).toBe(0);
      expect(result.usage.messageCount).toBe(0);
    });

    it("should return allowed=false when message limit exceeded", async () => {
      const user = createMockUser({ subscriptionTier: "free" });
      const config = createMockGlobalConfig(); // freeMessageLimit: 20
      const usageRecord = createMockUsageRecord({ messageCount: 20 });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(usageRecord);
      mockPrisma.usageRecord.findMany.mockResolvedValue([]);

      const result = await checkUsage("user_123");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("daily message limit");
      expect(result.resetTime).toBeDefined();
    });

    it("should return allowed=false when daily cost limit exceeded", async () => {
      const user = createMockUser({ subscriptionTier: "free" });
      const config = createMockGlobalConfig(); // freeDailyCostLimit: 0.1
      const usageRecord = createMockUsageRecord({ costTotal: 0.15, messageCount: 5 });

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(usageRecord);
      mockPrisma.usageRecord.findMany.mockResolvedValue([usageRecord]);

      const result = await checkUsage("user_123");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("daily usage limit");
    });

    it("should return allowed=false when weekly cost limit exceeded", async () => {
      const user = createMockUser({ subscriptionTier: "free" });
      const config = createMockGlobalConfig(); // freeWeeklyCostLimit: 0.5

      // Today's usage is under daily limit but weekly is over
      const todayRecord = createMockUsageRecord({ costTotal: 0.05, messageCount: 2 });
      const weeklyRecords = [
        createMockUsageRecord({ costTotal: 0.2 }),
        createMockUsageRecord({ costTotal: 0.2 }),
        createMockUsageRecord({ costTotal: 0.15 }),
      ]; // Total: 0.55 > 0.5

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(todayRecord);
      mockPrisma.usageRecord.findMany.mockResolvedValue(weeklyRecords);

      const result = await checkUsage("user_123");

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("weekly usage limit");
    });

    it("should respect admin overrides for limits", async () => {
      const user = createMockUser({
        subscriptionTier: "free",
        overrideMessageLimit: 1000, // Override free tier's 20 message limit
      });
      const config = createMockGlobalConfig();
      const usageRecord = createMockUsageRecord({ messageCount: 50 }); // Over free limit but under override

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(usageRecord);
      mockPrisma.usageRecord.findMany.mockResolvedValue([]);

      const result = await checkUsage("user_123");

      expect(result.allowed).toBe(true);
      expect(result.usage.messageLimit).toBe(1000);
    });

    it("should use correct limits for standard tier", async () => {
      const user = createMockUser({ subscriptionTier: "standard" });
      const config = createMockGlobalConfig();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(null);
      mockPrisma.usageRecord.findMany.mockResolvedValue([]);

      const result = await checkUsage("user_123");

      expect(result.allowed).toBe(true);
      expect(result.usage.dailyLimit).toBe(1.0); // Standard tier limit
      expect(result.usage.messageLimit).toBe(100); // Standard tier limit
    });

    it("should use correct limits for premium tier", async () => {
      const user = createMockUser({ subscriptionTier: "premium" });
      const config = createMockGlobalConfig();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(null);
      mockPrisma.usageRecord.findMany.mockResolvedValue([]);

      const result = await checkUsage("user_123");

      expect(result.allowed).toBe(true);
      expect(result.usage.dailyLimit).toBe(5.0); // Premium tier limit
      expect(result.usage.messageLimit).toBe(500); // Premium tier limit
    });

    it("should create default config if not exists", async () => {
      const user = createMockUser({ subscriptionTier: "free" });
      const config = createMockGlobalConfig();

      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.globalConfig.findUnique.mockResolvedValue(null); // No config
      mockPrisma.globalConfig.create.mockResolvedValue(config);
      mockPrisma.usageRecord.findUnique.mockResolvedValue(null);
      mockPrisma.usageRecord.findMany.mockResolvedValue([]);

      const result = await checkUsage("user_123");

      expect(mockPrisma.globalConfig.create).toHaveBeenCalled();
      expect(result.allowed).toBe(true);
    });
  });
});
