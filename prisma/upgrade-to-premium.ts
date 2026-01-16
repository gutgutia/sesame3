/**
 * Upgrade users to premium by email address
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts email1@example.com email2@example.com
 *
 * Options:
 *   --days <number>    Set subscription to expire in N days (default: 365)
 *   --permanent        No expiration date (permanent premium)
 *
 * Examples:
 *   # Upgrade for 1 year (default)
 *   npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts john@example.com
 *
 *   # Upgrade for 30 days
 *   npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts john@example.com --days 30
 *
 *   # Permanent upgrade (no expiration)
 *   npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts john@example.com --permanent
 *
 *   # Multiple users
 *   npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts user1@example.com user2@example.com user3@example.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upgradeToPremium(
  emails: string[],
  options: { days?: number; permanent?: boolean }
) {
  console.log("\n=== Upgrading Users to Premium ===\n");

  let subscriptionEndsAt: Date | null = null;

  if (options.permanent) {
    console.log("Mode: Permanent (no expiration)\n");
    subscriptionEndsAt = null;
  } else {
    const days = options.days || 365;
    subscriptionEndsAt = new Date();
    subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + days);
    console.log(`Mode: ${days} days (expires: ${subscriptionEndsAt.toLocaleDateString()})\n`);
  }

  const results = {
    upgraded: [] as string[],
    notFound: [] as string[],
    alreadyPremium: [] as string[],
    errors: [] as { email: string; error: string }[],
  };

  for (const email of emails) {
    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Find the user
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        select: {
          id: true,
          email: true,
          subscriptionTier: true,
          subscriptionEndsAt: true,
        },
      });

      if (!user) {
        console.log(`  ❌ Not found: ${normalizedEmail}`);
        results.notFound.push(normalizedEmail);
        continue;
      }

      // Check if already premium
      if (user.subscriptionTier === "paid") {
        const expiresStr = user.subscriptionEndsAt
          ? ` (expires: ${user.subscriptionEndsAt.toLocaleDateString()})`
          : " (permanent)";
        console.log(`  ⚠️  Already premium: ${normalizedEmail}${expiresStr}`);
        results.alreadyPremium.push(normalizedEmail);
        continue;
      }

      // Upgrade to premium
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionTier: "paid",
          subscriptionEndsAt: subscriptionEndsAt,
        },
      });

      const expiresStr = subscriptionEndsAt
        ? ` (expires: ${subscriptionEndsAt.toLocaleDateString()})`
        : " (permanent)";
      console.log(`  ✅ Upgraded: ${normalizedEmail}${expiresStr}`);
      results.upgraded.push(normalizedEmail);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`  ❌ Error upgrading ${normalizedEmail}: ${errorMessage}`);
      results.errors.push({ email: normalizedEmail, error: errorMessage });
    }
  }

  // Summary
  console.log("\n=== Summary ===\n");
  console.log(`  Upgraded:        ${results.upgraded.length}`);
  console.log(`  Already premium: ${results.alreadyPremium.length}`);
  console.log(`  Not found:       ${results.notFound.length}`);
  console.log(`  Errors:          ${results.errors.length}`);

  if (results.notFound.length > 0) {
    console.log(`\n  Not found emails: ${results.notFound.join(", ")}`);
  }

  if (results.errors.length > 0) {
    console.log("\n  Errors:");
    results.errors.forEach(({ email, error }) => {
      console.log(`    - ${email}: ${error}`);
    });
  }

  return results;
}

// Parse command line arguments
function parseArgs(args: string[]): { emails: string[]; options: { days?: number; permanent?: boolean } } {
  const emails: string[] = [];
  const options: { days?: number; permanent?: boolean } = {};

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === "--days" && i + 1 < args.length) {
      options.days = parseInt(args[i + 1], 10);
      if (isNaN(options.days) || options.days <= 0) {
        console.error("Error: --days must be a positive number");
        process.exit(1);
      }
      i += 2;
    } else if (arg === "--permanent") {
      options.permanent = true;
      i += 1;
    } else if (arg.includes("@")) {
      emails.push(arg);
      i += 1;
    } else {
      console.error(`Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return { emails, options };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts <email> [email2] [email3] [options]

Options:
  --days <number>    Set subscription to expire in N days (default: 365)
  --permanent        No expiration date (permanent premium)
  --help, -h         Show this help message

Examples:
  # Upgrade for 1 year (default)
  npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts john@example.com

  # Upgrade for 30 days
  npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts john@example.com --days 30

  # Permanent upgrade
  npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts john@example.com --permanent

  # Multiple users
  npx dotenv -e .env.local -- tsx prisma/upgrade-to-premium.ts user1@example.com user2@example.com
`);
    process.exit(0);
  }

  const { emails, options } = parseArgs(args);

  if (emails.length === 0) {
    console.error("Error: At least one email address is required");
    process.exit(1);
  }

  await upgradeToPremium(emails, options);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
