/**
 * Clear User Profile
 * Clears all profile data for a specific user by email or user ID
 *
 * Usage:
 *   npm run db:clear-user -- --email user@example.com
 *   npm run db:clear-user -- --id user-uuid-here
 *   npm run db:clear-user -- --email user@example.com --delete  # Also delete the user record
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ClearOptions {
  email?: string;
  userId?: string;
  deleteUser?: boolean;
}

async function clearUserProfile(userId: string, deleteUser: boolean = false) {
  console.log(`\n🔄 Clearing profile for user: ${userId}\n`);

  // Find the profile
  const profile = await prisma.studentProfile.findFirst({
    where: { userId },
    include: { testing: true },
  });

  if (!profile) {
    console.log(`  ⚠️  No profile found for user ${userId}`);
    return false;
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

  // Test scores (all under Testing)
  if (profile.testing) {
    const deletedSatScores = await prisma.sATScore.deleteMany({
      where: { testingId: profile.testing.id },
    });
    if (deletedSatScores.count > 0) console.log(`  🗑️  Deleted ${deletedSatScores.count} SAT scores`);

    const deletedActScores = await prisma.aCTScore.deleteMany({
      where: { testingId: profile.testing.id },
    });
    if (deletedActScores.count > 0) console.log(`  🗑️  Deleted ${deletedActScores.count} ACT scores`);

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

  // Access grants (where this profile granted access)
  const deletedAccessGrants = await prisma.accessGrant.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedAccessGrants.count > 0) console.log(`  🗑️  Deleted ${deletedAccessGrants.count} access grants`);

  // Invitations
  const deletedInvitations = await prisma.invitation.deleteMany({
    where: { studentProfileId: profile.id },
  });
  if (deletedInvitations.count > 0) console.log(`  🗑️  Deleted ${deletedInvitations.count} invitations`);

  if (deleteUser) {
    // Delete the profile and user completely
    await prisma.studentProfile.delete({
      where: { id: profile.id },
    });
    console.log(`  🗑️  Deleted student profile`);

    await prisma.user.delete({
      where: { id: userId },
    });
    console.log(`  🗑️  Deleted user record`);

    console.log(`\n  ✅ User completely deleted!\n`);
  } else {
    // Reset profile to minimal state (keep user)
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
        onboardingData: null,
      },
    });
    console.log(`  🔄 Reset profile to minimal state`);

    console.log(`\n  ✅ Profile cleared! User can log in fresh.\n`);
  }

  return true;
}

function parseArgs(): ClearOptions {
  const args = process.argv.slice(2);
  const options: ClearOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      options.email = args[i + 1].toLowerCase().trim();
      i++;
    } else if (args[i] === "--id" && args[i + 1]) {
      options.userId = args[i + 1];
      i++;
    } else if (args[i] === "--delete") {
      options.deleteUser = true;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
Clear User Profile - Removes all profile data for a user

Usage:
  npm run db:clear-user -- --email <email>     Clear profile by email
  npm run db:clear-user -- --id <user-id>      Clear profile by user ID

Options:
  --email <email>   Email address of the user to clear
  --id <user-id>    User ID to clear
  --delete          Also delete the user record entirely (not just reset)

Examples:
  npm run db:clear-user -- --email test@example.com
  npm run db:clear-user -- --email test@example.com --delete
  npm run db:clear-user -- --id abc123-def456
`);
}

async function main() {
  const options = parseArgs();

  if (!options.email && !options.userId) {
    printUsage();
    process.exit(0);
  }

  let userId: string | undefined = options.userId;

  // Look up user by email if provided
  if (options.email) {
    console.log(`\n🔍 Looking up user: ${options.email}`);

    const user = await prisma.user.findUnique({
      where: { email: options.email },
    });

    if (!user) {
      console.error(`\n❌ No user found with email: ${options.email}\n`);
      process.exit(1);
    }

    userId = user.id;
    console.log(`  Found user: ${user.id} (${user.name || "no name"})`);
  }

  if (!userId) {
    console.error("\n❌ No user ID to process\n");
    process.exit(1);
  }

  const success = await clearUserProfile(userId, options.deleteUser);

  if (!success) {
    process.exit(1);
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
