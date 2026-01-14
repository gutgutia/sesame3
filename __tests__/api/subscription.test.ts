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

      const response = await POST(createRequest({ action: "upgrade", plan: "paid" }));

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

      const response = await POST(createRequest({ action: "upgrade", plan: "paid" }));

      expect(response.status).toBe(404);
    });
  });

  describe("Upgrade", () => {
    it("should return 400 if already on paid tier", async () => {
      setupAuthenticatedUser();
      const profile = createMockProfile({
        user: createMockUser({ subscriptionTier: "paid" }),
      });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "upgrade", plan: "paid" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("already have a paid subscription");
    });

    it("should create checkout session for free user", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({ subscriptionTier: "free" });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue(user);

      const mockSession = createMockCheckoutSession();
      mockStripeInstance.customers.create.mockResolvedValue({ id: "cus_new123" });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const response = await POST(createRequest({ action: "upgrade", plan: "paid", yearly: false }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.checkoutUrl).toBe("https://checkout.stripe.com/mock");
    });

    it("should create checkout session with yearly pricing", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({ subscriptionTier: "free" });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue(user);

      const mockSession = createMockCheckoutSession();
      mockStripeInstance.customers.create.mockResolvedValue({ id: "cus_new123" });
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      const response = await POST(createRequest({ action: "upgrade", plan: "paid", yearly: true }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.checkoutUrl).toBe("https://checkout.stripe.com/mock");

      // Verify yearly price was used
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [{ price: "price_paid_yearly", quantity: 1 }],
        })
      );
    });

    it("should use existing customer ID if available", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "free",
        stripeCustomerId: "cus_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const mockSession = createMockCheckoutSession();
      mockStripeInstance.checkout.sessions.create.mockResolvedValue(mockSession);

      await POST(createRequest({ action: "upgrade", plan: "paid" }));

      // Should not create new customer
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
      // Should use existing customer ID
      expect(mockStripeInstance.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_existing",
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
        subscriptionTier: "paid",
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
        subscriptionTier: "paid",
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

  describe("Switch Interval", () => {
    it("should return 400 if trying to switch from yearly to monthly", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "paid",
        stripeSubscriptionId: "sub_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "switch-interval", yearly: false }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("not supported");
    });

    it("should return 400 if no active subscription", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "free",
        stripeSubscriptionId: null,
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      const response = await POST(createRequest({ action: "switch-interval", yearly: true }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("No active subscription");
    });

    it("should switch from monthly to yearly with proration", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "paid",
        stripeSubscriptionId: "sub_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);
      mockPrisma.user.update.mockResolvedValue(user);

      const futureDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        ...createMockSubscription(),
        items: {
          data: [{ id: "si_123", price: { id: "price_paid_monthly" } }],
        },
      });
      mockStripeInstance.subscriptions.update.mockResolvedValue({
        ...createMockSubscription(),
        current_period_end: futureDate,
        items: {
          data: [{ id: "si_123", price: { id: "price_paid_yearly" } }],
        },
      });

      const response = await POST(createRequest({ action: "switch-interval", yearly: true }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain("annual billing");

      expect(mockStripeInstance.subscriptions.update).toHaveBeenCalledWith(
        "sub_existing",
        expect.objectContaining({
          proration_behavior: "always_invoice",
        })
      );
    });

    it("should return 400 if already on yearly billing", async () => {
      setupAuthenticatedUser();
      const user = createMockUser({
        subscriptionTier: "paid",
        stripeSubscriptionId: "sub_existing",
      });
      const profile = createMockProfile({ user });
      mockPrisma.studentProfile.findUnique.mockResolvedValue(profile);

      mockStripeInstance.subscriptions.retrieve.mockResolvedValue({
        ...createMockSubscription(),
        items: {
          data: [{ id: "si_123", price: { id: "price_paid_yearly" } }],
        },
      });

      const response = await POST(createRequest({ action: "switch-interval", yearly: true }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("already on annual billing");
    });
  });
});
