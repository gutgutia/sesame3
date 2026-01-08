/**
 * Seed script to add dummy goal/task data for timeline testing
 * Run with: npx tsx scripts/seed-timeline-data.ts
 */

import { config } from "dotenv";
config({ path: ".env" });

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const USER_EMAIL = "abhishek.gutgutia+7@gmail.com";

async function main() {
  console.log("Finding user...");

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
    include: { studentProfile: true },
  });

  if (!user) {
    console.error(`User not found: ${USER_EMAIL}`);
    process.exit(1);
  }

  if (!user.studentProfile) {
    console.error(`User has no student profile: ${USER_EMAIL}`);
    process.exit(1);
  }

  const profileId = user.studentProfile.id;
  console.log(`Found profile: ${profileId}`);

  // Delete existing goals for clean slate
  await prisma.goal.deleteMany({
    where: { studentProfileId: profileId },
  });
  console.log("Cleared existing goals");

  // Create goals with tasks
  const now = new Date();
  const daysFromNow = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // Goal 1: Summer Research Program
  const goal1 = await prisma.goal.create({
    data: {
      studentProfileId: profileId,
      title: "Apply to MIT PRIMES",
      description: "Apply to MIT's Program for Research in Mathematics, Engineering, and Science",
      category: "research",
      status: "in_progress",
      priority: "high",
      targetDate: daysFromNow(30),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        studentProfileId: profileId,
        goalId: goal1.id,
        title: "Complete application essays",
        description: "Write the two required essays",
        status: "in_progress",
        dueDate: daysFromNow(7),
        priority: "high",
      },
      {
        studentProfileId: profileId,
        goalId: goal1.id,
        title: "Request teacher recommendation",
        status: "completed",
        completed: true,
        completedAt: new Date(),
        dueDate: daysFromNow(-5),
        priority: "high",
      },
      {
        studentProfileId: profileId,
        goalId: goal1.id,
        title: "Submit application",
        status: "pending",
        dueDate: daysFromNow(14),
        priority: "high",
      },
      {
        studentProfileId: profileId,
        goalId: goal1.id,
        title: "Prepare for interview",
        status: "pending",
        dueDate: daysFromNow(21),
        priority: "medium",
      },
    ],
  });

  // Goal 2: Competition Prep
  const goal2 = await prisma.goal.create({
    data: {
      studentProfileId: profileId,
      title: "USACO Gold Promotion",
      description: "Practice and compete to reach Gold division in USA Computing Olympiad",
      category: "competition",
      status: "in_progress",
      priority: "high",
      targetDate: daysFromNow(45),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        studentProfileId: profileId,
        goalId: goal2.id,
        title: "Complete 10 Silver problems",
        status: "in_progress",
        dueDate: daysFromNow(10),
        priority: "high",
      },
      {
        studentProfileId: profileId,
        goalId: goal2.id,
        title: "Review graph algorithms",
        status: "pending",
        dueDate: daysFromNow(5),
        priority: "medium",
      },
      {
        studentProfileId: profileId,
        goalId: goal2.id,
        title: "Take practice contest",
        status: "pending",
        dueDate: daysFromNow(12),
        priority: "medium",
      },
      {
        studentProfileId: profileId,
        goalId: goal2.id,
        title: "December Contest",
        type: "milestone",
        status: "pending",
        dueDate: daysFromNow(30),
        priority: "high",
      },
    ],
  });

  // Goal 3: Leadership Project
  const goal3 = await prisma.goal.create({
    data: {
      studentProfileId: profileId,
      title: "Launch Coding Workshop Series",
      description: "Organize weekly coding workshops for middle schoolers in the community",
      category: "leadership",
      status: "planning",
      priority: "medium",
      targetDate: daysFromNow(60),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        studentProfileId: profileId,
        goalId: goal3.id,
        title: "Create curriculum outline",
        status: "pending",
        dueDate: daysFromNow(14),
        priority: "medium",
      },
      {
        studentProfileId: profileId,
        goalId: goal3.id,
        title: "Find venue (library or community center)",
        status: "pending",
        dueDate: daysFromNow(21),
        priority: "medium",
      },
      {
        studentProfileId: profileId,
        goalId: goal3.id,
        title: "Recruit volunteer instructors",
        status: "pending",
        dueDate: daysFromNow(28),
        priority: "low",
      },
      {
        studentProfileId: profileId,
        goalId: goal3.id,
        title: "First workshop",
        type: "milestone",
        status: "pending",
        dueDate: daysFromNow(45),
        priority: "high",
      },
    ],
  });

  // Goal 4: Academic - SAT Prep
  const goal4 = await prisma.goal.create({
    data: {
      studentProfileId: profileId,
      title: "SAT Score Improvement",
      description: "Target 1550+ on the March SAT",
      category: "academic",
      status: "in_progress",
      priority: "high",
      targetDate: daysFromNow(75),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        studentProfileId: profileId,
        goalId: goal4.id,
        title: "Complete Khan Academy SAT course",
        status: "in_progress",
        dueDate: daysFromNow(20),
        priority: "high",
      },
      {
        studentProfileId: profileId,
        goalId: goal4.id,
        title: "Take practice test #1",
        status: "completed",
        completed: true,
        completedAt: daysFromNow(-10),
        dueDate: daysFromNow(-7),
        priority: "high",
      },
      {
        studentProfileId: profileId,
        goalId: goal4.id,
        title: "Take practice test #2",
        status: "pending",
        dueDate: daysFromNow(15),
        priority: "high",
      },
      {
        studentProfileId: profileId,
        goalId: goal4.id,
        title: "SAT Test Date",
        type: "milestone",
        status: "pending",
        dueDate: daysFromNow(60),
        priority: "high",
      },
    ],
  });

  // Goal 5: College Research (parking lot)
  const goal5 = await prisma.goal.create({
    data: {
      studentProfileId: profileId,
      title: "Visit East Coast Schools",
      description: "Plan campus visits to MIT, Harvard, Princeton",
      category: "application",
      status: "parking_lot",
      priority: "low",
      targetDate: daysFromNow(120),
    },
  });

  await prisma.task.createMany({
    data: [
      {
        studentProfileId: profileId,
        goalId: goal5.id,
        title: "Research campus tour dates",
        status: "pending",
        dueDate: daysFromNow(90),
        priority: "low",
      },
      {
        studentProfileId: profileId,
        goalId: goal5.id,
        title: "Book flights",
        status: "pending",
        dueDate: daysFromNow(100),
        priority: "low",
      },
    ],
  });

  console.log("\n✅ Created 5 goals with tasks:");
  console.log("  1. MIT PRIMES Application (in_progress, 4 tasks)");
  console.log("  2. USACO Gold Promotion (in_progress, 4 tasks)");
  console.log("  3. Coding Workshop Series (planning, 4 tasks)");
  console.log("  4. SAT Score Improvement (in_progress, 4 tasks)");
  console.log("  5. East Coast School Visits (parking_lot, 2 tasks)");
  console.log("\nTimeline should now show tasks with due dates!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
