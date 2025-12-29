import { vi } from "vitest";

// Create mock Prisma client
export const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
  },
  studentProfile: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  academics: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  testing: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  sATScore: {
    create: vi.fn(),
  },
  aCTScore: {
    create: vi.fn(),
  },
  course: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  activity: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  award: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  accessGrant: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  school: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  summerProgram: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
  usageRecord: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    create: vi.fn(),
  },
  globalConfig: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

// Helper to reset all mocks
export function resetPrismaMocks() {
  vi.clearAllMocks();
}

// Helper to create mock user
export function createMockUser(overrides = {}) {
  return {
    id: "user_mock123",
    email: "test@example.com",
    subscriptionTier: "free",
    subscriptionEndsAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    overrideDailyCostLimit: null,
    overrideWeeklyCostLimit: null,
    overrideMessageLimit: null,
    isAdmin: false,
    ...overrides,
  };
}

// Helper to create mock profile
export function createMockProfile(overrides = {}) {
  return {
    id: "profile_mock123",
    userId: "user_mock123",
    firstName: "Test",
    lastName: "User",
    preferredName: null,
    grade: "11th",
    graduationYear: 2026,
    highSchoolName: "Test High School",
    highSchoolCity: "Test City",
    highSchoolState: "CA",
    highSchoolType: "public",
    residencyStatus: "us_citizen",
    onboardingCompletedAt: new Date(),
    user: createMockUser(),
    ...overrides,
  };
}

// Helper to create mock academics
export function createMockAcademics(overrides = {}) {
  return {
    id: "academics_mock123",
    studentProfileId: "profile_mock123",
    schoolReportedGpaUnweighted: 3.8,
    schoolReportedGpaWeighted: 4.2,
    gpaScale: 4.0,
    classRank: 25,
    classSize: 400,
    ...overrides,
  };
}

// Helper to create mock testing record
export function createMockTesting(overrides = {}) {
  return {
    id: "testing_mock123",
    studentProfileId: "profile_mock123",
    planningToTakeSat: false,
    planningToTakeAct: false,
    psatTotal: 1400,
    psatMath: 720,
    psatReading: 680,
    satScores: [],
    actScores: [],
    apScores: [],
    subjectTests: [],
    ...overrides,
  };
}

// Helper to create mock SAT score
export function createMockSATScore(overrides = {}) {
  return {
    id: "sat_mock123",
    testingId: "testing_mock123",
    total: 1480,
    math: 760,
    reading: 720,
    testDate: new Date("2024-12-07"),
    isPrimary: true,
    isSuperscored: false,
    ...overrides,
  };
}

// Helper to create mock course
export function createMockCourse(overrides = {}) {
  return {
    id: "course_mock123",
    studentProfileId: "profile_mock123",
    name: "AP Calculus BC",
    subject: "Math",
    level: "ap",
    status: "completed",
    gradeLevel: "11th",
    grade: "A",
    gradeNumeric: 4.0,
    academicYear: "2023-2024",
    semester: "full_year",
    credits: 1,
    isCore: true,
    ...overrides,
  };
}

// Helper to create mock activity
export function createMockActivity(overrides = {}) {
  return {
    id: "activity_mock123",
    studentProfileId: "profile_mock123",
    title: "President",
    organization: "Science Olympiad",
    category: "club",
    description: "Lead team to state championships",
    hoursPerWeek: 10,
    weeksPerYear: 40,
    isLeadership: true,
    isSpike: true,
    isContinuing: true,
    displayOrder: 0,
    ...overrides,
  };
}

// Helper to create mock award
export function createMockAward(overrides = {}) {
  return {
    id: "award_mock123",
    studentProfileId: "profile_mock123",
    title: "National Merit Semifinalist",
    organization: "National Merit Scholarship Corporation",
    level: "national",
    category: "academic",
    year: 2025,
    displayOrder: 0,
    ...overrides,
  };
}

// Helper to create full mock profile with relations
export function createMockFullProfile(overrides = {}) {
  return {
    ...createMockProfile(),
    academics: createMockAcademics(),
    testing: createMockTesting({
      satScores: [createMockSATScore()],
    }),
    courses: [createMockCourse()],
    activities: [createMockActivity()],
    awards: [createMockAward()],
    aboutMe: null,
    programs: [],
    goals: [],
    schoolList: [],
    ...overrides,
  };
}

// Helper to create mock usage record
export function createMockUsageRecord(overrides = {}) {
  return {
    id: "usage_mock123",
    userId: "user_mock123",
    date: new Date(),
    messageCount: 0,
    tokensInput: 0,
    tokensOutput: 0,
    costAdvisor: 0,
    costParser: 0,
    costOther: 0,
    costTotal: 0,
    modelUsage: {},
    ...overrides,
  };
}

// Helper to create mock global config
export function createMockGlobalConfig(overrides = {}) {
  return {
    id: "default",
    freeDailyCostLimit: 0.1,
    freeWeeklyCostLimit: 0.5,
    freeMessageLimit: 20,
    standardDailyCostLimit: 1.0,
    standardWeeklyCostLimit: 5.0,
    standardMessageLimit: 100,
    premiumDailyCostLimit: 5.0,
    premiumWeeklyCostLimit: 25.0,
    premiumMessageLimit: 500,
    ...overrides,
  };
}
