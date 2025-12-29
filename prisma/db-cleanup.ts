/**
 * Database Cleanup Utility
 *
 * Usage:
 *   npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts [command]
 *
 * Commands:
 *   --programs        Remove all summer programs and their sessions
 *   --schools         Remove all schools and deadline years
 *   --users           Remove all users and their associated data (profiles, etc.)
 *   --all             Clear everything (nuclear option)
 *   --duplicates      Remove duplicate summer programs (keeps newest)
 *   --help            Show this help message
 *
 * Examples:
 *   npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts --programs
 *   npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts --duplicates
 *   npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts --all
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearSummerPrograms() {
  console.log("Clearing summer programs...");

  // Delete sessions first (child records)
  const sessionResult = await prisma.summerProgramSession.deleteMany({});
  console.log(`  Deleted ${sessionResult.count} program sessions`);

  // Delete programs
  const programResult = await prisma.summerProgram.deleteMany({});
  console.log(`  Deleted ${programResult.count} summer programs`);
}

async function clearSchools() {
  console.log("Clearing schools...");

  // Delete student-school associations first
  const studentSchoolResult = await prisma.studentSchool.deleteMany({});
  console.log(`  Deleted ${studentSchoolResult.count} student-school records`);

  // Delete school deadline years
  const deadlineResult = await prisma.schoolDeadlineYear.deleteMany({});
  console.log(`  Deleted ${deadlineResult.count} school deadline years`);

  // Delete schools
  const schoolResult = await prisma.school.deleteMany({});
  console.log(`  Deleted ${schoolResult.count} schools`);
}

async function clearUsers() {
  console.log("Clearing users and associated data...");

  // Delete in order of dependencies

  // Messages and conversations
  const messageResult = await prisma.message.deleteMany({});
  console.log(`  Deleted ${messageResult.count} messages`);

  const conversationResult = await prisma.conversation.deleteMany({});
  console.log(`  Deleted ${conversationResult.count} conversations`);

  // Student context
  const contextResult = await prisma.studentContext.deleteMany({});
  console.log(`  Deleted ${contextResult.count} student contexts`);

  // Tasks and goals
  const taskResult = await prisma.task.deleteMany({});
  console.log(`  Deleted ${taskResult.count} tasks`);

  const goalResult = await prisma.goal.deleteMany({});
  console.log(`  Deleted ${goalResult.count} goals`);

  // Student schools (already handled in clearSchools but safe to call again)
  const studentSchoolResult = await prisma.studentSchool.deleteMany({});
  console.log(`  Deleted ${studentSchoolResult.count} student-school records`);

  // Profile-related data
  const awardResult = await prisma.award.deleteMany({});
  console.log(`  Deleted ${awardResult.count} awards`);

  const activityResult = await prisma.activity.deleteMany({});
  console.log(`  Deleted ${activityResult.count} activities`);

  const programResult = await prisma.program.deleteMany({});
  console.log(`  Deleted ${programResult.count} programs (student programs)`);

  const courseResult = await prisma.course.deleteMany({});
  console.log(`  Deleted ${courseResult.count} courses`);

  const testingResult = await prisma.testing.deleteMany({});
  console.log(`  Deleted ${testingResult.count} testing records`);

  const academicsResult = await prisma.academics.deleteMany({});
  console.log(`  Deleted ${academicsResult.count} academics records`);

  const aboutMeResult = await prisma.aboutMe.deleteMany({});
  console.log(`  Deleted ${aboutMeResult.count} about me records`);

  // Access grants
  const accessGrantResult = await prisma.accessGrant.deleteMany({});
  console.log(`  Deleted ${accessGrantResult.count} access grants`);

  // Student profiles
  const profileResult = await prisma.studentProfile.deleteMany({});
  console.log(`  Deleted ${profileResult.count} student profiles`);

  // Organizations
  const orgResult = await prisma.organization.deleteMany({});
  console.log(`  Deleted ${orgResult.count} organizations`);

  // Users
  const userResult = await prisma.user.deleteMany({});
  console.log(`  Deleted ${userResult.count} users`);
}

async function removeDuplicatePrograms() {
  console.log("Finding and removing duplicate summer programs...");

  // Find all programs
  const allPrograms = await prisma.summerProgram.findMany({
    orderBy: { createdAt: "desc" }, // Newest first
  });

  // Group by name
  const programsByName = new Map<string, typeof allPrograms>();

  for (const program of allPrograms) {
    const key = program.name.toLowerCase();
    if (!programsByName.has(key)) {
      programsByName.set(key, []);
    }
    programsByName.get(key)!.push(program);
  }

  // Find duplicates and delete older ones
  let deletedCount = 0;

  for (const [name, programs] of programsByName) {
    if (programs.length > 1) {
      console.log(`  Found ${programs.length} copies of "${programs[0].name}"`);

      // Keep the first (newest due to sorting), delete the rest
      const toDelete = programs.slice(1);

      for (const program of toDelete) {
        // Delete sessions first
        await prisma.summerProgramSession.deleteMany({
          where: { summerProgramId: program.id },
        });

        // Delete program
        await prisma.summerProgram.delete({
          where: { id: program.id },
        });

        deletedCount++;
        console.log(`    Deleted duplicate: ${program.id} (year: ${program.programYear})`);
      }
    }
  }

  console.log(`\nRemoved ${deletedCount} duplicate programs`);
}

async function clearAll() {
  console.log("=== CLEARING ALL DATA ===\n");

  await clearUsers();
  console.log("");

  await clearSchools();
  console.log("");

  await clearSummerPrograms();

  console.log("\n=== ALL DATA CLEARED ===");
}

function showHelp() {
  console.log(`
Database Cleanup Utility

Usage:
  npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts [command]

Commands:
  --programs        Remove all summer programs and their sessions
  --schools         Remove all schools and deadline years
  --users           Remove all users and their associated data
  --all             Clear everything (nuclear option)
  --duplicates      Remove duplicate summer programs (keeps newest)
  --help            Show this help message

Examples:
  npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts --programs
  npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts --duplicates
  npx dotenv -e .env.local -- tsx prisma/db-cleanup.ts --all
`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help")) {
    showHelp();
    return;
  }

  try {
    if (args.includes("--all")) {
      console.log("\n⚠️  WARNING: This will delete ALL data!\n");
      await clearAll();
    } else if (args.includes("--programs")) {
      await clearSummerPrograms();
    } else if (args.includes("--schools")) {
      await clearSchools();
    } else if (args.includes("--users")) {
      await clearUsers();
    } else if (args.includes("--duplicates")) {
      await removeDuplicatePrograms();
    } else {
      console.log("Unknown command. Use --help to see available commands.");
    }

    console.log("\nDone!");
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
