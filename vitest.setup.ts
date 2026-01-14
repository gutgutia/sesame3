import { vi } from "vitest";

// Mock environment variables
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock";
// Two-tier pricing system: free and paid
process.env.STRIPE_PRICE_PAID_MONTHLY = "price_paid_monthly";
process.env.STRIPE_PRICE_PAID_YEARLY = "price_paid_yearly";
// Legacy price IDs (for backward compatibility)
process.env.STRIPE_PRICE_STANDARD_MONTHLY = "price_paid_monthly";
process.env.STRIPE_PRICE_STANDARD_YEARLY = "price_paid_yearly";
process.env.STRIPE_PRICE_PREMIUM_MONTHLY = "price_paid_monthly";
process.env.STRIPE_PRICE_PREMIUM_YEARLY = "price_paid_yearly";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mock console to reduce noise in tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
