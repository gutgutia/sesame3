import { vi } from "vitest";

// Create mock Stripe instance
export const mockStripeInstance = {
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  subscriptionSchedules: {
    release: vi.fn(),
    cancel: vi.fn(),
  },
  invoices: {
    createPreview: vi.fn(),
  },
  customers: {
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
};

// Mock Stripe constructor - must be a real function/class for `new` to work
export function MockStripe() {
  return mockStripeInstance;
}

// Helper to reset all mocks
export function resetStripeMocks() {
  vi.clearAllMocks();
}

// Helper to create subscription object (two-tier system: free and paid)
export function createMockSubscription(overrides = {}) {
  return {
    id: "sub_mock123",
    status: "active",
    customer: "cus_mock123",
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
    cancel_at_period_end: false,
    billing_cycle_anchor: Math.floor(Date.now() / 1000),
    schedule: null,
    items: {
      data: [
        {
          id: "si_mock123",
          price: {
            id: "price_paid_monthly",
          },
        },
      ],
    },
    ...overrides,
  };
}

// Helper to create checkout session (two-tier system: free and paid)
export function createMockCheckoutSession(overrides = {}) {
  return {
    id: "cs_mock123",
    url: "https://checkout.stripe.com/mock",
    subscription: "sub_mock123",
    metadata: {
      userId: "user_mock123",
      plan: "paid",
      yearly: "false",
    },
    ...overrides,
  };
}

// Helper to create Stripe event
export function createMockStripeEvent(type: string, data: unknown) {
  return {
    id: "evt_mock123",
    type,
    data: {
      object: data,
    },
  };
}
