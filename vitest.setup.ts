import { vi } from "vitest";

// Mock environment variables
process.env.STRIPE_SECRET_KEY = "sk_test_mock";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_mock";
process.env.STRIPE_PRICE_STANDARD_MONTHLY = "price_standard_monthly";
process.env.STRIPE_PRICE_STANDARD_YEARLY = "price_standard_yearly";
process.env.STRIPE_PRICE_PREMIUM_MONTHLY = "price_premium_monthly";
process.env.STRIPE_PRICE_PREMIUM_YEARLY = "price_premium_yearly";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Mock console to reduce noise in tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
