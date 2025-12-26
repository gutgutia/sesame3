/**
 * Reset Test User
 * Clears all profile data for a test user and optionally re-seeds
 * 
 * Usage: 
 *   npm run db:reset-test-user new         # Reset "new" user
 *   npm run db:reset-test-user building    # Reset "building" user
 *   npm run db:reset-test-user all         # Reset all test users
 */

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// User ID mapping
const USER_ID_MAP: Record<string, string> = {
  new: "test-user-new",
  onboarded: "test-user-onboarded",
  building: "test-user-building",
  complete: "test-user-complete",
};

async function resetTestUser(userKey: string) {
  const userId = USER_ID_MAP[userKey];
  
  if (!userId) {
    console.error(`Unknown user: ${userKey}`);
    console.log("Available users: new, onboarded, building, complete, all");
    process.exit(1);
  }

  console.log(`\n🔄 Resetting test user: ${userKey} (${userId})\n`);

  // Find the profile
  const profile = await prisma.studentProfile.findFirst({
    where: { userId },
    include: { testing: true },
  });

  if (!profile) {
    console.log(`  ⚠️  No profile found for user ${userId}`);
    return;
  }

  console.log(`  Found profile: ${profile.id}`);

  // Delete all related data in correct order (respecting foreign keys)
  
  // Messages and Conversations
  const conversations = await prisma.conversation.findMany({
    where: { studentProfileId: profile.id },
    select: { id: true },
  });
  if (conversations.length > 0) {
    await prisma.message.deleteMany({
      where: { conversationId: { in: conversations.map(c => c.id) } },
    });
    await prisma.conversation.deleteMany({
      where: { studentProfileId: profile.id },
    });
    console.log(`  🗑️  Deleted ${conversations.length} conversations`);
  }

  // Tasks (under Goals)
  const goals = await prisma.goal.findMany({
    where: { studentProfileId: profile.id },
    select: { id: true },
  });
  if (goals.length > 0) {
    await prisma.task.deleteMany({
      where: { goalId: { in: goals.map(g => g.id) } },
    });
  }

  // Goals
  const deletedGoals = await prisma.goal.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedGoals.count > 0) console.log(`  🗑️  Deleted ${deletedGoals.count} goals`);

  // StudentSchool (school list)
  const deletedSchools = await prisma.studentSchool.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedSchools.count > 0) console.log(`  🗑️  Deleted ${deletedSchools.count} school list entries`);

  // Programs
  const deletedPrograms = await prisma.program.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedPrograms.count > 0) console.log(`  🗑️  Deleted ${deletedPrograms.count} programs`);

  // Awards
  const deletedAwards = await prisma.award.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedAwards.count > 0) console.log(`  🗑️  Deleted ${deletedAwards.count} awards`);

  // Activities
  const deletedActivities = await prisma.activity.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedActivities.count > 0) console.log(`  🗑️  Deleted ${deletedActivities.count} activities`);

  // Courses
  const deletedCourses = await prisma.course.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedCourses.count > 0) console.log(`  🗑️  Deleted ${deletedCourses.count} courses`);

  // AP Scores and Subject Tests (under Testing)
  if (profile.testing) {
    await prisma.aPScore.deleteMany({
      where: { testingId: profile.testing.id },
    });
    await prisma.subjectTest.deleteMany({
      where: { testingId: profile.testing.id },
    });
  }

  // Testing
  const deletedTesting = await prisma.testing.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedTesting.count > 0) console.log(`  🗑️  Deleted testing data`);

  // Academics
  const deletedAcademics = await prisma.academics.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedAcademics.count > 0) console.log(`  🗑️  Deleted academics data`);

  // AboutMe
  const deletedAboutMe = await prisma.aboutMe.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedAboutMe.count > 0) console.log(`  🗑️  Deleted about me`);

  // StudentContext
  const deletedContext = await prisma.studentContext.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedContext.count > 0) console.log(`  🗑️  Deleted student context`);

  // Reset profile to minimal state
  await prisma.studentProfile.update({
    where: { id: profile.id },
    data: {
      preferredName: null,
      grade: null,
      graduationYear: null,
      highSchoolName: null,
      highSchoolCity: null,
      highSchoolState: null,
      highSchoolType: null,
      onboardingCompletedAt: null,
      onboardingData: Prisma.JsonNull,
    },
  });
  console.log(`  🔄 Reset profile to minimal state`);

  console.log(`\n  ✅ User "${userKey}" has been reset!\n`);
}

async function resetAllTestUsers() {
  console.log("\n🔄 Resetting ALL test users...\n");
  
  for (const userKey of Object.keys(USER_ID_MAP)) {
    await resetTestUser(userKey);
  }
  
  console.log("\n🎉 All test users reset!\n");
  console.log("Run `npm run db:seed-test-users` to re-seed them.\n");
}

// Main
async function main() {
  const arg = process.argv[2];
  
  if (!arg) {
    console.log("\nUsage: npm run db:reset-test-user <user>\n");
    console.log("Available users:");
    console.log("  new        - New user (just signed up)");
    console.log("  onboarded  - Onboarded user (basic info)");
    console.log("  building   - Building user (partial profile)");
    console.log("  complete   - Complete user (full profile)");
    console.log("  all        - Reset all test users");
    console.log("");
    process.exit(0);
  }

  if (arg === "all") {
    await resetAllTestUsers();
  } else {
    await resetTestUser(arg);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
