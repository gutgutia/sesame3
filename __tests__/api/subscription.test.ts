import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  mockPrisma,
  resetPrismaMocks,
  createMockUser,
  createMockProfile,
} from "../mocks/prisma";
import {
  mockStripeInstance,
  resetStripeMocks,
  createMockSubscription,
  createMockCheckoutSession,
  MockStripe,
} from "../mocks/stripe";
import { mockRequireProfile, resetAuthMocks, setupAuthenticatedUser, setupUnauthenticated } from "../mocks/auth";

// Mock modules
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  requireProfile: mockRequireProfile,
}));

vi.mock("stripe", () => ({
  default: MockStripe,
}));

// Import after mocking
import { POST } from "@/app/api/subscription/route";

describe("POST /api/subscription", () => {
  beforeEach(() => {
    resetPrismaMocks();
    resetStripeMocks();
    resetAuthMocks();
  });

  function createRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost:3000/api/subscription", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  describe("Authentication", () => {
    it("should return 401 if not authenticated", async () => {
      setupUnauthenticated();

      const response = await POST(createRequest({ action: "upgrade", plan: "standard" }));

      expect(response.status).toBe(401);
    });
  });

  describe("Validation", () => {
    it("should return 400 for invalid action", async () => {
      setupAuthenticatedUser();
      const profile = createMockProfile();
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "invalid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid action");
    });

    it("should return 404 if profile not found", async () => {
      setupAuthenticatedUser();
      mockPrisma.studentProfile.findUnique.mockResolvedValue(null);

      const response = await POST(createRequest({ action: "upgrade", plan: "standard" }));

      expect(response.status).toBe(404);
    });
  });

  describe("Upgrade", () => {
    it("should return 400 for invalid plan", async () => {
      setupAuthenticatedUser();
      const profile = createMockProfile({
        user: createMockUser({ subscriptionTier: "free" }),
      });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "upgrade", plan: "invalid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid plan");
    });

    it("should return 400 if not actually an upgrade", async () => {
      setupAuthenticatedUser();
      const profile = createMockProfile({
        user: createMockUser({ subscriptionTier: "premium" }),
      });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "upgrade", plan: "standard" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not an upgrade");
    });

    it("should create checkout session for user without subscription", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({ subscriptionTier: "free" });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue(user);

      const mockSession = createMockCheckoutSession();
      mockStripeInstance.customers.create.mockResolvedValue({ id: "cus_new123" });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const response = await POST(createRequest({ action: "upgrade", plan: "standard" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.checkoutUrl).toBe("https://checkout.stripe.com/mock");
    });

    it("should update existing subscription inline with proration", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "standard",
        stripeSubscriptionId: "sub_existing",
        stripeCustomerId: "cus_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue({ ...user, subscriptionTier: "premium" });

      const mockSubscription = createMockSubscription({ status: "active" });
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        ...mockSubscription,
        items: { data: [{ price: { id: "price_premium_yearly" } }] },
      });

      const response = await POST(createRequest({ action: "upgrade", plan: "premium" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tier).toBe("premium");
      expect(data.immediate).toBe(true);

      // Verify proration behavior was set
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        "sub_existing",
        expect.objectContaining({
          proration_behavior: "create_prorations",
          cancel_at_period_end: false,
        })
      );
    });

    it("should release existing schedule before upgrade", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "standard",
        stripeSubscriptionId: "sub_existing",
        stripeCustomerId: "cus_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue({ ...user, subscriptionTier: "premium" });

      const mockSubscription = createMockSubscription({
        status: "active",
        schedule: "sub_sched_123", // Has a schedule
      });
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockStripeInstance.subscriptionSchedules.release.mockResolvedValue({});
      mockStripeInstance.subscriptions.update.mockResolvedValue(mockSubscription);

      await POST(createRequest({ action: "upgrade", plan: "premium" }));

      expect(mockStripeInstance.subscriptionSchedules.release).toHaveBeenCalledWith("sub_sched_123");
    });

    it("should fallback to cancel if release fails", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "standard",
        stripeSubscriptionId: "sub_existing",
        stripeCustomerId: "cus_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue({ ...user, subscriptionTier: "premium" });

      const mockSubscription = createMockSubscription({
        status: "active",
        schedule: "sub_sched_123",
      });
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockStripeInstance.subscriptionSchedules.release.mockRejectedValue(new Error("Release failed"));
      mockStripeInstance.subscriptionSchedules.cancel.mockResolvedValue({});
      mockStripeInstance.subscriptions.update.mockResolvedValue(mockSubscription);

      await POST(createRequest({ action: "upgrade", plan: "premium" }));

      expect(mockStripeInstance.subscriptionSchedules.cancel).toHaveBeenCalledWith("sub_sched_123");
    });
  });

  describe("Downgrade", () => {
    it("should return 400 if trying to downgrade to invalid plan", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({ subscriptionTier: "premium" });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "downgrade", plan: "free" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Can only downgrade to 'standard'");
    });

    it("should return 400 if not actually a downgrade", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({ subscriptionTier: "standard" });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "downgrade", plan: "standard" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not a downgrade");
    });

    it("should return 400 if no subscription to downgrade", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "premium",
        stripeSubscriptionId: null, // No subscription
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "downgrade", plan: "standard" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No active subscription");
    });

    it("should downgrade subscription with no proration", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "premium",
        stripeSubscriptionId: "sub_existing",
        stripeCustomerId: "cus_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue({ ...user, subscriptionTier: "standard" });

      const mockSubscription = createMockSubscription({ status: "active" });
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(mockSubscription);
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        ...mockSubscription,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      });

      const response = await POST(createRequest({ action: "downgrade", plan: "standard" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tier).toBe("standard");

      // Verify no proration
      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        "sub_existing",
        expect.objectContaining({
          proration_behavior: "none",
        })
      );
    });
  });

  describe("Cancel", () => {
    it("should return 400 if no subscription to cancel", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "free",
        stripeSubscriptionId: null,
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "cancel" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No active subscription");
    });

    it("should set cancel_at_period_end on subscription", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "standard",
        stripeSubscriptionId: "sub_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const futureDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        ...createMockSubscription(),
        cancel_at_period_end: true,
        current_period_end: futureDate,
      });

      const response = await POST(createRequest({ action: "cancel" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.accessUntil).toBeDefined();

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        "sub_existing",
        { cancel_at_period_end: true }
      );
    });
  });

  describe("Reactivate", () => {
    it("should return 400 if no subscription to reactivate", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "free",
        stripeSubscriptionId: null,
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "reactivate" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No subscription");
    });

    it("should remove cancel_at_period_end flag", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "standard",
        stripeSubscriptionId: "sub_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const futureDate = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        ...createMockSubscription(),
        cancel_at_period_end: false,
        current_period_end: futureDate,
      });

      const response = await POST(createRequest({ action: "reactivate" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.nextBilling).toBeDefined();

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        "sub_existing",
        { cancel_at_period_end: false }
      );
    });
  });
});
