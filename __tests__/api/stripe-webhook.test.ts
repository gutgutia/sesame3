import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  mockPrisma,
  resetPrismaMocks,
  createMockUser,
} from "../mocks/prisma";
import {
  mockStripeInstance,
  resetStripeMocks,
  createMockSubscription,
  createMockCheckoutSession,
  createMockStripeEvent,
  MockStripe,
} from "../mocks/stripe";

// Mock modules
vi.mock("@/lib/db", () => ({
  prisma: mockPrisma,
}));

vi.mock("stripe", () => ({
  default: MockStripe,
}));

// Import after mocking
import { POST } from "@/app/api/webhooks/stripe/route";

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    resetPrismaMocks();
    resetStripeMocks();
  });

  function createWebhookRequest(body: string, signature = "valid_signature") {
    return new NextRequest("http://localhost:3000/api/webhooks/stripe", {
      method: "POST",
      body,
      headers: {
        "stripe-signature": signature,
      },
    });
  }

  describe("Signature Verification", () => {
    it("should return 400 if signature is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Missing signature");
    });

    it("should return 400 if signature is invalid", async () => {
      mockStripeInstance.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      const response = await POST(createWebhookRequest("{}", "invalid_signature"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid signature");
    });
  });

  describe("checkout.session.completed", () => {
    it("should update user tier on successful checkout", async () => {
      const session = createMockCheckoutSession({
        metadata: { userId: "user_123", plan: "standard" },
        subscription: "sub_new123",
      });
      const event = createMockStripeEvent("checkout.session.completed", session);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(
        createMockSubscription({ current_period_end: 1735689600 }) // Jan 1, 2025
      );
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "standard" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: expect.objectContaining({
          subscriptionTier: "standard",
          stripeSubscriptionId: "sub_new123",
        }),
      });
    });

    it("should set premium tier for premium plan", async () => {
      const session = createMockCheckoutSession({
        metadata: { userId: "user_123", plan: "premium" },
        subscription: "sub_new123",
      });
      const event = createMockStripeEvent("checkout.session.completed", session);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockStripeInstance.subscriptions.retrieve.mockResolvedValue(createMockSubscription());
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "premium" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: expect.objectContaining({
          subscriptionTier: "premium",
        }),
      });
    });

    it("should handle missing metadata gracefully", async () => {
      const session = createMockCheckoutSession({
        metadata: {}, // No userId or plan
      });
      const event = createMockStripeEvent("checkout.session.completed", session);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      // Should return 200 (acknowledge receipt) but not update user
      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.updated", () => {
    it("should update user tier based on price ID (premium monthly)", async () => {
      const subscription = createMockSubscription({
        customer: "cus_123",
        status: "active",
        items: {
          data: [{ id: "si_123", price: { id: "price_premium_monthly" } }],
        },
      });
      const event = createMockStripeEvent("customer.subscription.updated", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: "user_123" }));
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "premium" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: expect.objectContaining({
          subscriptionTier: "premium",
        }),
      });
    });

    it("should update user tier based on price ID (standard yearly)", async () => {
      const subscription = createMockSubscription({
        customer: "cus_123",
        status: "active",
        items: {
          data: [{ id: "si_123", price: { id: "price_standard_yearly" } }],
        },
      });
      const event = createMockStripeEvent("customer.subscription.updated", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: "user_123" }));
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "standard" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: expect.objectContaining({
          subscriptionTier: "standard",
        }),
      });
    });

    it("should reset to free tier if subscription not active", async () => {
      const subscription = createMockSubscription({
        customer: "cus_123",
        status: "canceled",
        items: {
          data: [{ id: "si_123", price: { id: "price_standard_monthly" } }],
        },
      });
      const event = createMockStripeEvent("customer.subscription.updated", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: "user_123" }));
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "free" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: expect.objectContaining({
          subscriptionTier: "free",
          subscriptionEndsAt: null,
          stripeSubscriptionId: null,
        }),
      });
    });

    it("should handle trialing status as active", async () => {
      const subscription = createMockSubscription({
        customer: "cus_123",
        status: "trialing",
        items: {
          data: [{ id: "si_123", price: { id: "price_premium_yearly" } }],
        },
      });
      const event = createMockStripeEvent("customer.subscription.updated", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: "user_123" }));
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "premium" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: expect.objectContaining({
          subscriptionTier: "premium",
        }),
      });
    });

    it("should handle user not found gracefully", async () => {
      const subscription = createMockSubscription({ customer: "cus_unknown" });
      const event = createMockStripeEvent("customer.subscription.updated", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("should reset user to free tier on subscription deletion", async () => {
      const subscription = createMockSubscription({
        customer: "cus_123",
      });
      const event = createMockStripeEvent("customer.subscription.deleted", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: "user_123" }));
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "free" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "user_123" },
        data: {
          subscriptionTier: "free",
          subscriptionEndsAt: null,
          stripeSubscriptionId: null,
        },
      });
    });

    it("should handle user not found gracefully", async () => {
      const subscription = createMockSubscription({ customer: "cus_unknown" });
      const event = createMockStripeEvent("customer.subscription.deleted", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("invoice.payment_failed", () => {
    it("should handle payment failure gracefully", async () => {
      const invoice = {
        id: "in_123",
        customer: "cus_123",
        subscription: "sub_123",
      };
      const event = createMockStripeEvent("invoice.payment_failed", invoice);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: "user_123" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      // Should not update user tier on payment failure (Stripe handles retries)
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it("should handle unknown customer gracefully", async () => {
      const invoice = {
        id: "in_123",
        customer: "cus_unknown",
        subscription: "sub_123",
      };
      const event = createMockStripeEvent("invoice.payment_failed", invoice);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
    });
  });

  describe("Unhandled Events", () => {
    it("should acknowledge unhandled event types", async () => {
      const event = createMockStripeEvent("some.unhandled.event", {});

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should return 500 if database update throws", async () => {
      const subscription = createMockSubscription({
        customer: "cus_123",
        status: "active",
      });
      const event = createMockStripeEvent("customer.subscription.updated", subscription);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockPrisma.user.findFirst.mockResolvedValue(createMockUser({ id: "user_123" }));
      mockPrisma.user.update.mockRejectedValue(new Error("Database error"));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Webhook handler failed");
    });

    it("should continue if subscription retrieval fails during checkout (resilient handling)", async () => {
      // The webhook is designed to be resilient - subscription detail fetch failure
      // shouldn't prevent the user update
      const session = createMockCheckoutSession({
        metadata: { userId: "user_123", plan: "standard" },
        subscription: "sub_new123",
      });
      const event = createMockStripeEvent("checkout.session.completed", session);

      mockStripeInstance.webhooks.constructEvent.mockReturnValue(event);
      mockStripeInstance.subscriptions.retrieve.mockRejectedValue(new Error("Stripe error"));
      mockPrisma.user.update.mockResolvedValue(createMockUser({ subscriptionTier: "standard" }));

      const response = await POST(createWebhookRequest(JSON.stringify(event)));

      // Should still succeed - error is caught internally
      expect(response.status).toBe(200);
      // User should still be updated with tier (but without subscriptionEndsAt)
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });
  });
});
