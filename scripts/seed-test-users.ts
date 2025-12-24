/**
 * Seed Test Users
 * Creates 4 test personas at different stages for testing
 * 
 * Usage: npm run db:seed-test-users
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// TEST PERSONAS
// =============================================================================

const TEST_USERS = [
  {
    id: "test-user-new",
    email: "new@test.sesame.com",
    name: "New User",
    profile: {
      firstName: "Alex",
      // No other data - brand new user
    },
  },
  {
    id: "test-user-onboarded",
    email: "onboarded@test.sesame.com",
    name: "Onboarded User",
    profile: {
      firstName: "Jordan",
      preferredName: "Jordan",
      grade: "11th",
      graduationYear: 2026,
      highSchoolName: "Lincoln High School",
      highSchoolCity: "San Francisco",
      highSchoolState: "CA",
    },
  },
  {
    id: "test-user-building",
    email: "building@test.sesame.com",
    name: "Building User",
    profile: {
      firstName: "Sarah",
      preferredName: "Sarah",
      grade: "11th",
      graduationYear: 2026,
      highSchoolName: "Palo Alto High School",
      highSchoolCity: "Palo Alto",
      highSchoolState: "CA",
      academics: {
        gpaUnweighted: 3.9,
        gpaWeighted: 4.2,
      },
      testing: {
        satTotal: 1490,
        satMath: 760,
        satReading: 730,
      },
      activities: [
        {
          title: "Captain",
          organization: "Robotics Team",
          category: "club",
          isLeadership: true,
          description: "Lead team of 15 members, qualified for state competition",
          hoursPerWeek: 10,
        },
        {
          title: "Member",
          organization: "Math Olympiad Club",
          category: "club",
          isLeadership: false,
          hoursPerWeek: 5,
        },
        {
          title: "Volunteer Tutor",
          organization: "Local Library",
          category: "volunteer",
          isLeadership: false,
          description: "Tutor middle school students in math",
          hoursPerWeek: 3,
        },
      ],
      awards: [
        {
          title: "AIME Qualifier",
          level: "national",
          year: 2024,
        },
      ],
    },
  },
  {
    id: "test-user-complete",
    email: "complete@test.sesame.com",
    name: "Complete User",
    profile: {
      firstName: "Max",
      preferredName: "Max",
      grade: "12th",
      graduationYear: 2025,
      highSchoolName: "Gunn High School",
      highSchoolCity: "Palo Alto",
      highSchoolState: "CA",
      aboutMe: {
        story: "I've always been fascinated by how things work. When I was 10, I took apart my family's broken microwave just to see the components inside. That curiosity led me to robotics, where I discovered I love the intersection of engineering and teaching others.",
        interests: ["robotics", "math", "teaching"],
        values: ["curiosity", "equity", "persistence"],
      },
      academics: {
        gpaUnweighted: 3.95,
        gpaWeighted: 4.4,
        classRank: 5,
        classSize: 450,
      },
      testing: {
        satTotal: 1560,
        satMath: 800,
        satReading: 760,
        actComposite: 35,
      },
      activities: [
        {
          title: "Founder & President",
          organization: "EduAccess Nonprofit",
          category: "club",
          isLeadership: true,
          description: "Founded peer tutoring org with 50+ tutors. Partnered with 3 local districts.",
          hoursPerWeek: 15,
          isSpike: true,
        },
        {
          title: "Varsity Captain",
          organization: "Tennis Team",
          category: "sport",
          isLeadership: true,
          description: "Led team to regional finals. Organized summer training camps.",
          hoursPerWeek: 12,
        },
        {
          title: "Lead Programmer",
          organization: "Robotics Club",
          category: "club",
          isLeadership: true,
          description: "Developed autonomous navigation system. Team qualified for state.",
          hoursPerWeek: 10,
        },
        {
          title: "Research Assistant",
          organization: "Stanford Bio Lab",
          category: "work",
          isLeadership: false,
          description: "Summer research on protein folding simulations",
          hoursPerWeek: 20,
        },
      ],
      awards: [
        { title: "USAMO Qualifier", level: "national", year: 2024 },
        { title: "AP Scholar with Distinction", level: "national", year: 2024 },
        { title: "Regional Science Fair - 1st Place", level: "regional", year: 2023 },
        { title: "National Merit Semifinalist", level: "national", year: 2024 },
      ],
      programs: [
        { name: "Stanford SIMR", organization: "Stanford", type: "research", status: "completed", year: 2024 },
        { name: "COSMOS", organization: "UC System", type: "summer", status: "completed", year: 2023 },
      ],
      goals: [
        {
          title: "Complete MIT Application",
          category: "application",
          status: "in_progress",
          priority: "high",
        },
        {
          title: "Finalize Personal Essay",
          category: "application",
          status: "planning",
          priority: "high",
        },
      ],
      schools: [
        { name: "MIT", tier: "reach" },
        { name: "Stanford", tier: "reach" },
        { name: "UC Berkeley", tier: "target" },
        { name: "UCLA", tier: "target" },
        { name: "UC San Diego", tier: "safety" },
      ],
    },
  },
];

// =============================================================================
// SEED FUNCTION
// =============================================================================

async function seedTestUsers() {
  console.log("🌱 Seeding test users...\n");

  for (const testUser of TEST_USERS) {
    console.log(`Creating: ${testUser.name} (${testUser.email})`);

    // Create or update user
    const user = await prisma.user.upsert({
      where: { id: testUser.id },
      update: { name: testUser.name, email: testUser.email },
      create: {
        id: testUser.id,
        email: testUser.email,
        name: testUser.name,
      },
    });

    // Check if profile exists
    let profile = await prisma.studentProfile.findFirst({
      where: { userId: user.id },
    });

    if (profile) {
      console.log(`  ⚠️  Profile exists, updating basic info only`);
      profile = await prisma.studentProfile.update({
        where: { id: profile.id },
        data: {
          firstName: testUser.profile.firstName,
          preferredName: testUser.profile.preferredName,
          grade: testUser.profile.grade,
          graduationYear: testUser.profile.graduationYear,
          highSchoolName: testUser.profile.highSchoolName,
          highSchoolCity: testUser.profile.highSchoolCity,
          highSchoolState: testUser.profile.highSchoolState,
        },
      });
    } else {
      console.log(`  ✨ Creating new profile`);
      profile = await prisma.studentProfile.create({
        data: {
          userId: user.id,
          firstName: testUser.profile.firstName,
          preferredName: testUser.profile.preferredName,
          grade: testUser.profile.grade,
          graduationYear: testUser.profile.graduationYear,
          highSchoolName: testUser.profile.highSchoolName,
          highSchoolCity: testUser.profile.highSchoolCity,
          highSchoolState: testUser.profile.highSchoolState,
        },
      });

      // Create related data for profiles that need it
      const profileData = testUser.profile;

      // AboutMe
      if (profileData.aboutMe) {
        await prisma.aboutMe.create({
          data: {
            studentProfileId: profile.id,
            interests: profileData.aboutMe.interests,
            values: profileData.aboutMe.values,
          },
        });
        console.log(`  📝 Added AboutMe`);
      }

      // Academics
      if (profileData.academics) {
        await prisma.academics.create({
          data: {
            studentProfileId: profile.id,
            gpaUnweighted: profileData.academics.gpaUnweighted,
            gpaWeighted: profileData.academics.gpaWeighted,
            classRank: profileData.academics.classRank,
            classSize: profileData.academics.classSize,
          },
        });
        console.log(`  📚 Added Academics`);
      }

      // Testing
      if (profileData.testing) {
        await prisma.testing.create({
          data: {
            studentProfileId: profile.id,
            satTotal: profileData.testing.satTotal,
            satMath: profileData.testing.satMath,
            satReading: profileData.testing.satReading,
            actComposite: profileData.testing.actComposite,
          },
        });
        console.log(`  📝 Added Testing`);
      }

      // Activities
      if (profileData.activities) {
        for (let i = 0; i < profileData.activities.length; i++) {
          const activity = profileData.activities[i];
          await prisma.activity.create({
            data: {
              studentProfileId: profile.id,
              title: activity.title,
              organization: activity.organization,
              category: activity.category,
              isLeadership: activity.isLeadership,
              description: activity.description,
              hoursPerWeek: activity.hoursPerWeek,
              isSpike: activity.isSpike,
              displayOrder: i,
            },
          });
        }
        console.log(`  🏃 Added ${profileData.activities.length} Activities`);
      }

      // Awards
      if (profileData.awards) {
        for (let i = 0; i < profileData.awards.length; i++) {
          const award = profileData.awards[i];
          await prisma.award.create({
            data: {
              studentProfileId: profile.id,
              title: award.title,
              level: award.level,
              year: award.year,
              displayOrder: i,
            },
          });
        }
        console.log(`  🏆 Added ${profileData.awards.length} Awards`);
      }

      // Programs
      if (profileData.programs) {
        for (const program of profileData.programs) {
          await prisma.program.create({
            data: {
              studentProfileId: profile.id,
              name: program.name,
              organization: program.organization,
              type: program.type,
              status: program.status,
              year: program.year,
            },
          });
        }
        console.log(`  🔬 Added ${profileData.programs.length} Programs`);
      }

      // Goals
      if (profileData.goals) {
        for (let i = 0; i < profileData.goals.length; i++) {
          const goal = profileData.goals[i];
          await prisma.goal.create({
            data: {
              studentProfileId: profile.id,
              title: goal.title,
              category: goal.category,
              status: goal.status,
              priority: goal.priority,
              displayOrder: i,
            },
          });
        }
        console.log(`  🎯 Added ${profileData.goals.length} Goals`);
      }

      // Schools
      if (profileData.schools) {
        for (let i = 0; i < profileData.schools.length; i++) {
          const schoolData = profileData.schools[i];
          
          // Find or create school
          let school = await prisma.school.findFirst({
            where: { name: schoolData.name },
          });
          
          if (!school) {
            school = await prisma.school.create({
              data: { name: schoolData.name },
            });
          }
          
          await prisma.studentSchool.create({
            data: {
              studentProfileId: profile.id,
              schoolId: school.id,
              tier: schoolData.tier,
              displayOrder: i,
            },
          });
        }
        console.log(`  🏫 Added ${profileData.schools.length} Schools`);
      }
    }

    console.log(`  ✅ Done: Profile ID = ${profile.id}\n`);
  }

  console.log("🎉 All test users seeded!\n");
  console.log("Test Users:");
  console.log("──────────────────────────────────────────");
  for (const user of TEST_USERS) {
    console.log(`  ${user.name.padEnd(20)} → ${user.id}`);
  }
  console.log("──────────────────────────────────────────\n");
}

// Run
seedTestUsers()
  .catch((e) => {
    console.error("Error seeding test users:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
