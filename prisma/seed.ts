/**
 * Main Seed File - Seeds all reference data
 *
 * This file orchestrates seeding for:
 * - Summer Programs (from seed-programs.ts)
 * - Schools (from seed-schools.ts)
 *
 * Usage:
 *   npm run db:seed              # Seed everything
 *   npm run db:seed-programs     # Seed only programs
 *   npm run db:seed-schools      # Seed only schools
 */

import { execSync } from "child_process";
import path from "path";

async function main() {
  console.log("=== SEEDING ALL REFERENCE DATA ===\n");

  const seedDir = path.dirname(__filename);

  // Seed programs
  console.log("--- Seeding Summer Programs ---");
  execSync(`tsx ${path.join(seedDir, "seed-programs.ts")}`, {
    stdio: "inherit",
    env: process.env,
  });

  console.log("\n--- Seeding Schools ---");
  execSync(`tsx ${path.join(seedDir, "seed-schools.ts")}`, {
    stdio: "inherit",
    env: process.env,
  });

  console.log("\n=== ALL SEEDING COMPLETE ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
