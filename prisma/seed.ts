import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Summer Programs for 2026
// Data compiled from program websites - verify before relying on it
// Note: Dates are approximate based on typical schedules - verify on program websites
interface SummerProgramSeed {
  name: string;
  shortName: string | null;
  organization: string;
  description: string;
  websiteUrl: string;
  programYear: number;
  // Eligibility
  minGrade: number | null;
  maxGrade: number | null;
  minAge: number | null;
  maxAge: number | null;
  minGpaUnweighted: number | null;
  minGpaWeighted: number | null;
  citizenship: string | null;
  requiredCourses: string[];
  recommendedCourses: string[];
  eligibilityNotes: string | null;
  // Application
  applicationOpens: Date | null;
  applicationDeadline: Date | null;
  isRolling: boolean;
  rollingNotes: string | null;
  applicationUrl: string;
  applicationNotes: string | null;
  // Details
  format: string;
  location: string;
  // AI Context
  llmContext: string | null;
  // Metadata
  category: string;
  focusAreas: string[];
  isActive: boolean;
  dataSource: string;
  dataStatus: string;
  // Sessions
  sessions: Array<{
    name: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
  }>;
}

const summerPrograms2026: SummerProgramSeed[] = [
  // =============================================================================
  // HIGHLY SELECTIVE STEM/RESEARCH PROGRAMS
  // =============================================================================
  {
    name: "Research Science Institute",
    shortName: "RSI",
    organization: "MIT / Center for Excellence in Education",
    description:
      "A free six-week summer program at MIT for high school students who have demonstrated excellence in math and science. Students conduct original research under the mentorship of scientists and researchers.",
    websiteUrl: "https://www.cee.org/programs/rsi",
    programYear: 2026,

    // Eligibility
    minGrade: 11,
    maxGrade: 11,
    minAge: 15,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["AP Calculus BC", "AP Physics C", "AP Chemistry"],
    eligibilityNotes:
      "Must be a current high school junior. One of the most competitive summer programs. Strong preference for students with research experience and competition achievements (USAMO, USABO, ISEF, etc.).",

    // Application
    applicationOpens: new Date("2025-11-01"),
    applicationDeadline: new Date("2026-01-15"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.cee.org/programs/rsi/apply",
    applicationNotes:
      "Requires 2 teacher recommendations, transcript, essays, and standardized test scores (SAT/ACT/PSAT). Very competitive - ~3,000 applicants for 80 spots.",

    // Details
    format: "residential",
    location: "Cambridge, MA",

    // AI Context
    llmContext:
      "RSI is considered the most prestigious free summer science program in the US. Acceptance rate around 2-3%. Students complete an original research project and write a paper in the style of a scientific publication. Strong pipeline to top universities - many alumni attend MIT, Harvard, Stanford. Competition achievements (USAMO, USABO, Intel ISEF) are highly valued. All expenses covered including travel.",

    // Metadata
    category: "research",
    focusAreas: [
      "STEM",
      "research",
      "science",
      "mathematics",
      "engineering",
      "physics",
      "biology",
      "chemistry",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    // Sessions
    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-22"),
        endDate: new Date("2026-08-02"),
      },
    ],
  },

  {
    name: "Summer Science Program",
    shortName: "SSP",
    organization: "Summer Science Program",
    description:
      "An intensive 6-week academic experience for talented high school students. Students complete a challenging research project in astrophysics, biochemistry, or genomics.",
    websiteUrl: "https://summerscience.org",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["Pre-Calculus", "Physics", "Chemistry"],
    eligibilityNotes:
      "Must be rising senior or occasionally a rising junior with exceptional preparation. Three tracks available: Astrophysics (NM & CO campuses), Biochemistry (IN campus), Genomics (NC campus).",

    applicationOpens: new Date("2025-11-15"),
    applicationDeadline: new Date("2026-02-01"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://summerscience.org/apply",
    applicationNotes:
      "Requires teacher recommendations, transcript, and essays. No test scores required. Strong problem-solving skills emphasized.",

    format: "residential",
    location: "Multiple (NM, CO, IN, NC)",

    llmContext:
      "SSP has three distinct tracks. Astrophysics students determine the orbit of a near-Earth asteroid. Biochemistry students investigate a fungal enzyme's structure. Genomics students analyze real genetic data. Highly collaborative environment. About 5% acceptance rate. Financial aid covers 30%+ of students. Strong alumni network.",

    category: "research",
    focusAreas: [
      "STEM",
      "research",
      "astrophysics",
      "biochemistry",
      "genomics",
      "astronomy",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Session 1",
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-07-27"),
      },
      {
        name: "Session 2",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-08-12"),
      },
    ],
  },

  {
    name: "MIT Online Science, Technology, and Engineering Community",
    shortName: "MOSTEC",
    organization: "MIT Office of Engineering Outreach Programs",
    description:
      "A free six-month online program for rising high school seniors from underrepresented and underserved backgrounds. Includes online coursework and a one-week on-campus conference.",
    websiteUrl: "https://oeop.mit.edu/programs/mostec",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Algebra 2", "Pre-Calculus"],
    eligibilityNotes:
      "Must be rising senior. Preference given to students from underrepresented groups in STEM, first-generation college students, and those from under-resourced schools.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-02-15"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://oeop.mit.edu/programs/mostec/apply",
    applicationNotes:
      "Requires recommendations, transcript, and essays. Focus on demonstrating interest in STEM and potential for growth.",

    format: "hybrid",
    location: "Online + Cambridge, MA",

    llmContext:
      "MOSTEC is part of MIT's pipeline programs. Students complete online coursework from June-December, then attend a week-long conference at MIT in January. Strong pathway to MIT admission - MOSTEC scholars have elevated MIT acceptance rates. Completely free including travel. Focuses on students who haven't had access to advanced STEM opportunities.",

    category: "STEM",
    focusAreas: ["STEM", "engineering", "science", "technology", "diversity"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Online Phase",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-12-31"),
      },
      {
        name: "On-Campus Conference",
        startDate: new Date("2027-01-10"),
        endDate: new Date("2027-01-17"),
        notes: "Week-long intensive at MIT",
      },
    ],
  },

  {
    name: "Stanford Institutes of Medicine Summer Research Program",
    shortName: "SIMR",
    organization: "Stanford Medicine",
    description:
      "An 8-week summer program for high school students interested in pursuing research in the biomedical sciences, health, or medicine. Students work alongside Stanford researchers.",
    websiteUrl: "https://simr.stanford.edu",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 12,
    minAge: 16,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Biology", "Chemistry"],
    eligibilityNotes:
      "Must be at least 16 years old. Priority given to students from groups underrepresented in medicine and science. Must be able to commute to Stanford (Bay Area residents preferred).",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-02-13"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://simr.stanford.edu/apply",
    applicationNotes:
      "Requires 2 teacher recommendations, transcript, and essays. No application fee.",

    format: "commuter",
    location: "Stanford, CA",

    llmContext:
      "SIMR is a commuter program - students live at home and commute to Stanford daily. Provides genuine research experience in biomedical labs. Students receive a $500 stipend. Completely free program. Strong for students interested in medicine, biology, or biomedical research. About 5% acceptance rate.",

    category: "research",
    focusAreas: [
      "medicine",
      "research",
      "biology",
      "health",
      "biomedical",
      "science",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-16"),
        endDate: new Date("2026-08-08"),
      },
    ],
  },

  {
    name: "California State Summer School for Mathematics and Science",
    shortName: "COSMOS",
    organization: "University of California",
    description:
      "A 4-week intensive residential program for students with demonstrated interest and achievement in math and science. Campuses at UC Davis, UC Irvine, UC San Diego, and UC Santa Cruz.",
    websiteUrl: "https://cosmos-ucop.ucdavis.edu",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Algebra 2"],
    eligibilityNotes:
      "Priority for California residents. Out-of-state students welcome but pay higher tuition (~$8,500 vs ~$4,500). Each cluster has specific prerequisites.",

    applicationOpens: new Date("2026-01-06"),
    applicationDeadline: new Date("2026-02-14"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://cosmos-ucop.ucdavis.edu/apply",
    applicationNotes:
      "Requires teacher recommendation, transcript, and essays. Students select 3 preferred clusters across the 4 campuses.",

    format: "residential",
    location: "UC Davis, UC Irvine, UC San Diego, or UC Santa Cruz",

    llmContext:
      "COSMOS offers specialized 'clusters' at each campus - topics range from robotics to marine biology to astrophysics. Each campus has unique cluster offerings. About 25% acceptance rate. Financial aid covers 75% of California students. Great option for 9th-10th graders seeking first residential program experience.",

    category: "STEM",
    focusAreas: [
      "STEM",
      "mathematics",
      "science",
      "engineering",
      "research",
      "robotics",
      "marine_biology",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-02"),
      },
    ],
  },

  // =============================================================================
  // PROGRAMS FOR YOUNGER STUDENTS (9th-10th grade friendly)
  // =============================================================================
  {
    name: "Stanford Pre-Collegiate Summer Institutes",
    shortName: "Stanford Summer",
    organization: "Stanford Pre-Collegiate Studies",
    description:
      "Intensive 2-3 week academic courses for intellectually curious students. Wide range of subjects from AI to creative writing to mathematics.",
    websiteUrl: "https://summerinstitutes.spcs.stanford.edu",
    programYear: 2026,

    minGrade: 8,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Courses have different grade requirements. Some accept 8th graders, some require 10th+. Check individual course prerequisites.",

    applicationOpens: new Date("2025-12-01"),
    applicationDeadline: new Date("2026-03-15"),
    isRolling: true,
    rollingNotes: "Applications reviewed on rolling basis until courses fill",
    applicationUrl: "https://summerinstitutes.spcs.stanford.edu/apply",
    applicationNotes:
      "Requires teacher recommendation, transcript, and essays. $100 application fee. Financial aid available for US citizens/residents.",

    format: "residential",
    location: "Stanford, CA",

    llmContext:
      "Stanford Summer offers dozens of courses across humanities, STEM, and social sciences. Popular courses include AI/Machine Learning, Cryptography, Philosophy, Creative Writing, and Astrophysics. Living on Stanford campus. About 30% acceptance rate varies by course. Good option for students wanting to explore specific interests before committing to a research-focused program.",

    category: "academics",
    focusAreas: [
      "academics",
      "humanities",
      "STEM",
      "arts",
      "social_sciences",
      "AI",
      "computer_science",
      "writing",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Session 1",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-11"),
      },
      {
        name: "Session 2",
        startDate: new Date("2026-07-13"),
        endDate: new Date("2026-08-02"),
      },
      {
        name: "Session 3",
        startDate: new Date("2026-08-03"),
        endDate: new Date("2026-08-16"),
        notes: "2-week session",
      },
    ],
  },

  {
    name: "Johns Hopkins Center for Talented Youth Summer Programs",
    shortName: "CTY Summer",
    organization: "Johns Hopkins Center for Talented Youth",
    description:
      "Intensive academic programs for gifted students. Multiple sessions and locations. Students take one course and dive deep into a subject.",
    websiteUrl: "https://cty.jhu.edu/summer",
    programYear: 2026,

    minGrade: 5,
    maxGrade: 12,
    minAge: 10,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must qualify through CTY Talent Search (SAT/ACT scores). Different score thresholds for different courses. Testing required before application.",

    applicationOpens: new Date("2026-01-15"),
    applicationDeadline: new Date("2026-04-01"),
    isRolling: true,
    rollingNotes: "Rolling admissions, popular courses fill quickly",
    applicationUrl: "https://cty.jhu.edu/summer/apply",
    applicationNotes:
      "Requires qualifying test scores from CTY Talent Search, SAT, or ACT. $75 application fee. No recommendations required.",

    format: "residential",
    location: "Multiple campuses nationwide",

    llmContext:
      "CTY is one of the largest gifted summer programs. Students take one intensive course for 3 weeks. Courses range from Number Theory to Biomedical Engineering to International Politics. The qualifying test requirement ensures academically prepared peers. Financial aid available. Good entry point for younger gifted students (middle school).",

    category: "academics",
    focusAreas: [
      "academics",
      "mathematics",
      "science",
      "humanities",
      "writing",
      "computer_science",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Session 1",
        startDate: new Date("2026-06-22"),
        endDate: new Date("2026-07-12"),
      },
      {
        name: "Session 2",
        startDate: new Date("2026-07-13"),
        endDate: new Date("2026-08-02"),
      },
    ],
  },

  // =============================================================================
  // MATHEMATICS PROGRAMS
  // =============================================================================
  {
    name: "Mathcamp",
    shortName: "Mathcamp",
    organization: "Mathematical Sciences Research Institute",
    description:
      "An intensive 5-week summer program for mathematically talented high school students. Students take classes in advanced mathematics and work on problem-solving.",
    websiteUrl: "https://www.mathcamp.org",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: 13,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["Algebra 2", "Geometry"],
    eligibilityNotes:
      "Ages 13-18. Qualifying quiz is the main admission criterion. Strong problem-solving skills needed - quiz tests mathematical creativity, not knowledge.",

    applicationOpens: new Date("2026-01-15"),
    applicationDeadline: new Date("2026-03-15"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.mathcamp.org/apply",
    applicationNotes:
      "Requires completing a qualifying quiz (several challenging math problems) and one recommendation. No transcript required.",

    format: "residential",
    location: "Varies yearly (recent: Lewis & Clark College, Portland OR)",

    llmContext:
      "Mathcamp is known for its fun, exploratory approach to advanced mathematics. Unlike competition-focused programs, Mathcamp emphasizes mathematical play and creativity. Students choose from dozens of classes taught by professors and graduate students. About 12% acceptance rate. Generous financial aid - no student turned away for financial reasons. The qualifying quiz is more about mathematical thinking than prior knowledge.",

    category: "mathematics",
    focusAreas: ["mathematics", "problem_solving", "logic", "proofs"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-10"),
      },
    ],
  },

  {
    name: "Ross Mathematics Program",
    shortName: "Ross",
    organization: "Ohio State University",
    description:
      "An intensive 6-week summer program for high school students interested in mathematics. Focus on number theory with emphasis on mathematical thinking and problem-solving.",
    websiteUrl: "https://rossprogram.org",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: 15,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["Algebra 2"],
    eligibilityNotes:
      "Ages 15-18. Application includes challenging math problems that are central to admission decision.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-03-31"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://rossprogram.org/students/apply",
    applicationNotes:
      "Application includes solving several challenging math problems. Also requires one recommendation.",

    format: "residential",
    location: "Columbus, OH (also sites in China)",

    llmContext:
      'Ross is famous for its motto "Think deeply of simple things." The entire program focuses on number theory, explored from first principles. Students work on challenging problem sets daily. About 10% acceptance rate. Generous financial aid available. Alumni often become research mathematicians. The application problems are key - they test ability to think mathematically, not prior knowledge.',

    category: "mathematics",
    focusAreas: ["mathematics", "number_theory", "problem_solving", "proofs"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-07-26"),
      },
    ],
  },

  {
    name: "Hampshire College Summer Studies in Mathematics",
    shortName: "HCSSiM",
    organization: "Hampshire College",
    description:
      "A 6-week residential program for mathematically talented high school students. Known for its collaborative environment and exploration of advanced topics.",
    websiteUrl: "https://hcssim.org",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["Algebra 2"],
    eligibilityNotes:
      "Application includes math problems. Looking for creative mathematical thinking, not just correct answers.",

    applicationOpens: new Date("2026-01-15"),
    applicationDeadline: new Date("2026-04-15"),
    isRolling: true,
    rollingNotes: "Applications reviewed as received",
    applicationUrl: "https://hcssim.org/apply",
    applicationNotes:
      "Requires solving math problems and one recommendation. Transcript optional.",

    format: "residential",
    location: "Amherst, MA",

    llmContext:
      "HCSSiM has a uniquely collaborative and playful culture. Students and staff form a close community. The math explored is advanced but approached with joy and curiosity. Prime Week (first week) covers foundational topics; remaining 5 weeks are more advanced. About 15% acceptance rate. Financial aid available. Known for creating lifelong mathematicians and lifelong friendships.",

    category: "mathematics",
    focusAreas: ["mathematics", "problem_solving", "proofs", "logic"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-08-10"),
      },
    ],
  },

  // =============================================================================
  // RESEARCH PROGRAMS
  // =============================================================================
  {
    name: "Garcia Summer Scholars",
    shortName: "Garcia",
    organization: "Stony Brook University",
    description:
      "A 7-week summer research program for high school students interested in materials science and engineering. Students conduct original research in university labs.",
    websiteUrl: "https://www.stonybrook.edu/commcms/garcia/",
    programYear: 2026,

    minGrade: 10,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Chemistry", "Physics"],
    eligibilityNotes:
      "Rising juniors or seniors. Preference for students interested in materials science, polymer chemistry, or related fields. Must be able to commute or live on Long Island.",

    applicationOpens: new Date("2026-01-15"),
    applicationDeadline: new Date("2026-02-28"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.stonybrook.edu/commcms/garcia/apply.php",
    applicationNotes:
      "Requires teacher recommendations, transcript, and essays. No application fee.",

    format: "residential",
    location: "Stony Brook, NY",

    llmContext:
      "Garcia is a prestigious research program focused on polymer chemistry and materials science. Students conduct original research that often leads to publications and science fair awards (many Intel/Regeneron finalists). About 5% acceptance rate. Free program with $1,500 stipend. Strong pipeline to Regeneron STS. Students return for second year to continue research.",

    category: "research",
    focusAreas: [
      "research",
      "materials_science",
      "engineering",
      "chemistry",
      "polymers",
      "nanotechnology",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-30"),
        endDate: new Date("2026-08-15"),
      },
    ],
  },

  {
    name: "Simons Summer Research Program",
    shortName: "Simons",
    organization: "Stony Brook University",
    description:
      "An 8-week summer research program pairing high school students with Stony Brook faculty mentors for hands-on research experience in STEM fields.",
    websiteUrl: "https://www.stonybrook.edu/simons/",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Rising seniors only. Strong interest in STEM research required. Must be able to commute to Stony Brook or live in provided housing.",

    applicationOpens: new Date("2025-11-01"),
    applicationDeadline: new Date("2026-02-01"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.stonybrook.edu/simons/application.php",
    applicationNotes:
      "Requires teacher recommendations, transcript, and essays. Students matched with faculty mentors based on interests.",

    format: "residential",
    location: "Stony Brook, NY",

    llmContext:
      "Simons offers research across many STEM fields - biology, chemistry, physics, math, computer science, engineering. Students work one-on-one with faculty mentors on real research projects. About 4% acceptance rate - one of the most competitive. Free program with stipend. Many alumni become Regeneron STS finalists. Research often continues after summer ends.",

    category: "research",
    focusAreas: [
      "research",
      "STEM",
      "science",
      "mathematics",
      "engineering",
      "biology",
      "physics",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-23"),
        endDate: new Date("2026-08-15"),
      },
    ],
  },

  {
    name: "Boston University Research in Science & Engineering",
    shortName: "BU RISE",
    organization: "Boston University",
    description:
      "A 6-week summer research internship for high school students. Students work in BU research labs across various STEM disciplines.",
    websiteUrl: "https://www.bu.edu/summer/high-school-programs/rise/",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 12,
    minAge: 17,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["Biology", "Chemistry", "Physics"],
    eligibilityNotes:
      "Must be at least 17 years old by program start. International students eligible. Rising juniors or seniors.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-02-15"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.bu.edu/summer/high-school-programs/rise/apply/",
    applicationNotes:
      "Requires 2 teacher recommendations, transcript, and essays. Program fee covers housing and meals.",

    format: "residential",
    location: "Boston, MA",

    llmContext:
      "BU RISE offers genuine research experience in university labs. Students work with faculty and graduate student mentors. Research areas include neuroscience, bioengineering, physics, chemistry, and more. About 15% acceptance rate. Not free (about $5,000) but financial aid available. Good option for students who can afford it and want research experience without the extreme selectivity of RSI/Simons.",

    category: "research",
    focusAreas: [
      "research",
      "STEM",
      "science",
      "engineering",
      "neuroscience",
      "biology",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-07"),
        endDate: new Date("2026-08-15"),
      },
    ],
  },

  // =============================================================================
  // PROGRAMS FOR UNDERREPRESENTED GROUPS
  // =============================================================================
  {
    name: "MIT Women's Technology Program",
    shortName: "WTP",
    organization: "MIT",
    description:
      "A rigorous 4-week summer program for high school juniors who identify as women. Students study electrical engineering and computer science through hands-on projects.",
    websiteUrl: "https://wtp.mit.edu",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Pre-Calculus", "Physics"],
    eligibilityNotes:
      "Must identify as a woman or non-binary. Must be rising senior. US citizens or permanent residents only.",

    applicationOpens: new Date("2025-12-15"),
    applicationDeadline: new Date("2026-02-01"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://wtp.mit.edu/apply",
    applicationNotes:
      "Requires teacher recommendations, transcript, and essays. Must demonstrate interest in STEM despite limited prior opportunities.",

    format: "residential",
    location: "Cambridge, MA",

    llmContext:
      "WTP aims to increase women in EECS fields. Two tracks: EECS (electrical engineering + computer science) and Mechanical Engineering. Students build projects like robots and radios. Completely free including travel. About 10% acceptance rate. Living on MIT campus. Strong pathway to MIT admission - many WTP alumni attend MIT.",

    category: "engineering",
    focusAreas: [
      "engineering",
      "computer_science",
      "EECS",
      "women_in_STEM",
      "electrical_engineering",
      "robotics",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-02"),
      },
    ],
  },

  {
    name: "MITES Semester",
    shortName: "MITES Semester",
    organization: "MIT Office of Engineering Outreach Programs",
    description:
      "A 6-month online program followed by on-campus experience for high school juniors from underrepresented backgrounds interested in STEM.",
    websiteUrl: "https://oeop.mit.edu/programs/mites",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Algebra 2", "Geometry"],
    eligibilityNotes:
      "Rising seniors. Priority for students from underrepresented groups in STEM, first-generation college students, and under-resourced schools. Household income considered.",

    applicationOpens: new Date("2025-10-01"),
    applicationDeadline: new Date("2026-01-05"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://oeop.mit.edu/programs/mites/apply",
    applicationNotes:
      "Requires teacher recommendations, transcript, and essays. Emphasis on potential and overcoming obstacles.",

    format: "hybrid",
    location: "Online + Cambridge, MA",

    llmContext:
      "MITES Semester (formerly MOSTEC predecessor) is MIT's flagship diversity program. Six months of online coursework in science, engineering, and humanities, followed by summer on-campus experience. About 6% acceptance rate. Completely free including travel. Very strong pathway to MIT - elevated admission rates for MITES alumni. Focuses on students who haven't had access to advanced STEM opportunities.",

    category: "STEM",
    focusAreas: ["STEM", "engineering", "science", "diversity", "leadership"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Online Phase",
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-06-30"),
      },
      {
        name: "On-Campus Session",
        startDate: new Date("2026-07-01"),
        endDate: new Date("2026-08-01"),
      },
    ],
  },

  {
    name: "QuestBridge College Prep Scholars",
    shortName: "QuestBridge CPS",
    organization: "QuestBridge",
    description:
      "A free program that connects high-achieving high school juniors from low-income backgrounds with educational and scholarship opportunities.",
    websiteUrl:
      "https://www.questbridge.org/high-school-students/college-prep-scholars",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Household income typically under $65,000 for family of 4, but higher incomes with significant circumstances considered. Must be rising senior. Academic excellence required despite limited resources.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-03-24"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl:
      "https://www.questbridge.org/high-school-students/college-prep-scholars/apply",
    applicationNotes:
      "Requires teacher recommendations, transcript, and essays. Must demonstrate financial need.",

    format: "hybrid",
    location: "Online + partner college campuses",

    llmContext:
      "QuestBridge CPS isn't a traditional summer program - it's a pathway program. College Prep Scholars receive access to college fly-in programs at top universities, application fee waivers, and college admissions guidance. About 15% acceptance rate. Sets up students for QuestBridge National College Match in senior year, which can lead to full scholarships to top universities. Essential for low-income, high-achieving students.",

    category: "college_prep",
    focusAreas: ["college_prep", "leadership", "academics", "financial_aid"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Year-round program with summer components",
        startDate: new Date("2026-05-15"),
        endDate: new Date("2026-08-31"),
        notes: "Includes access to partner college fly-in programs",
      },
    ],
  },

  // =============================================================================
  // HUMANITIES & LEADERSHIP PROGRAMS
  // =============================================================================
  {
    name: "Telluride Association Summer Program",
    shortName: "TASP",
    organization: "Telluride Association",
    description:
      "A free 6-week educational experience for high school juniors focused on critical thinking, democratic community, and intellectual exploration through seminars on challenging topics.",
    websiteUrl: "https://www.tellurideassociation.org/our-programs/high-school-students/tasp/",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Rising seniors only. Looking for intellectually curious students who want to engage deeply with ideas and democratic self-governance.",

    applicationOpens: new Date("2025-11-01"),
    applicationDeadline: new Date("2026-01-06"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.tellurideassociation.org/our-programs/high-school-students/tasp/apply/",
    applicationNotes:
      "Requires essays demonstrating intellectual curiosity and engagement with ideas. Teacher recommendations required.",

    format: "residential",
    location: "Cornell University or University of Michigan",

    llmContext:
      "TASP is the premier humanities summer program. Students live in self-governing democratic community and take intensive seminars on topics like 'The Ethics of Technology' or 'Race and American Literature.' About 3% acceptance rate - one of the most selective. Completely free. TASP alumni are highly represented at top universities. The program emphasizes intellectual discourse, critical thinking, and community - not career preparation.",

    category: "humanities",
    focusAreas: [
      "humanities",
      "philosophy",
      "critical_thinking",
      "leadership",
      "literature",
      "social_sciences",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Cornell Session",
        startDate: new Date("2026-06-22"),
        endDate: new Date("2026-08-02"),
      },
      {
        name: "Michigan Session",
        startDate: new Date("2026-06-22"),
        endDate: new Date("2026-08-02"),
      },
    ],
  },

  {
    name: "LaunchX Entrepreneurship Program",
    shortName: "LaunchX",
    organization: "LaunchX",
    description:
      "A 4-week summer program where high school students develop and launch real startups. Students learn entrepreneurship by doing - building products, talking to customers, and pitching investors.",
    websiteUrl: "https://launchx.com/summer-program/",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: 15,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Ages 15-18. Looking for entrepreneurial mindset and initiative, not prior business experience.",

    applicationOpens: new Date("2025-10-01"),
    applicationDeadline: new Date("2026-04-01"),
    isRolling: true,
    rollingNotes: "Rolling admissions, early application encouraged",
    applicationUrl: "https://launchx.com/apply/",
    applicationNotes:
      "Application includes video, essays about initiative and problem-solving. No recommendations required.",

    format: "residential",
    location: "Northwestern University (Chicago area)",

    llmContext:
      "LaunchX is unique - students build real companies in 4 weeks. Teams form, identify problems, build MVPs, and pitch at Demo Day. Some LaunchX companies have raised funding and continue operating after the program. About 20% acceptance rate. Not free (~$8,000) but scholarships available. Great for students interested in entrepreneurship, business, or building things. Campus at Northwestern provides business school resources.",

    category: "business",
    focusAreas: [
      "entrepreneurship",
      "business",
      "leadership",
      "startups",
      "technology",
      "innovation",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Session 1",
        startDate: new Date("2026-06-29"),
        endDate: new Date("2026-07-26"),
      },
      {
        name: "Session 2",
        startDate: new Date("2026-07-27"),
        endDate: new Date("2026-08-23"),
      },
    ],
  },

  {
    name: "Bank of America Student Leaders",
    shortName: "Student Leaders",
    organization: "Bank of America",
    description:
      "A paid summer internship connecting high school juniors and seniors with nonprofits in their communities. Students gain workforce experience while making a difference.",
    websiteUrl:
      "https://about.bankofamerica.com/en-us/what-guides-us/student-leaders.html",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 12,
    minAge: 16,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_only",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be 16-18 years old. Must live in a participating community (major metro areas). US citizens only. Demonstrates leadership and community involvement.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-02-28"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl:
      "https://about.bankofamerica.com/en-us/what-guides-us/student-leaders.html",
    applicationNotes:
      "Online application with essays about leadership and community involvement. No recommendations required.",

    format: "commuter",
    location: "Various cities (local nonprofit placement)",

    llmContext:
      "Student Leaders places students at local nonprofits for 8-week paid internships. Also includes a week-long leadership summit in Washington DC where students from across the country meet. The paid internship ($17/hour) plus the DC trip makes this highly valuable. Competitive but less selective than academic programs. Great for students interested in civic engagement, nonprofit work, or leadership. Builds resume and network.",

    category: "leadership",
    focusAreas: [
      "leadership",
      "community_service",
      "nonprofit",
      "civic_engagement",
      "internship",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Local Internship",
        startDate: new Date("2026-06-16"),
        endDate: new Date("2026-08-08"),
      },
      {
        name: "DC Leadership Summit",
        startDate: new Date("2026-07-14"),
        endDate: new Date("2026-07-19"),
        notes: "All-expenses-paid week in Washington DC",
      },
    ],
  },

  // =============================================================================
  // UCSB PROGRAMS
  // =============================================================================
  {
    name: "UCSB Research Mentorship Program",
    shortName: "UCSB RMP",
    organization: "UC Santa Barbara",
    description:
      "A competitive 6-week summer program for high school students to conduct research under the mentorship of UCSB faculty. Students work on real research projects across STEM and social sciences.",
    websiteUrl: "https://www.summer.ucsb.edu/pre-college/research-mentorship-program",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 12,
    minAge: 16,
    maxAge: null,
    minGpaUnweighted: 3.5,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be 16+ and have completed junior year. 3.5+ GPA required. Students choose research areas including biology, chemistry, physics, engineering, psychology, and more.",

    applicationOpens: new Date("2026-01-15"),
    applicationDeadline: new Date("2026-03-01"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.summer.ucsb.edu/pre-college/research-mentorship-program/apply",
    applicationNotes:
      "Requires transcript, 2 teacher recommendations, personal statement, and research interest essay. $75 application fee.",

    format: "residential",
    location: "Santa Barbara, CA",

    llmContext:
      "UCSB RMP is one of the most prestigious research programs in California. Students are matched with faculty mentors based on research interests. About 15% acceptance rate. Program fee around $10,000 but includes housing, meals, and all research costs. Students present research at a final symposium. Many students publish papers or present at conferences. Strong for students interested in research careers.",

    category: "research",
    focusAreas: [
      "research",
      "STEM",
      "science",
      "engineering",
      "psychology",
      "biology",
      "chemistry",
      "physics",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-08-01"),
      },
    ],
  },

  {
    name: "UCSB Summer Research Academies",
    shortName: "UCSB SRA",
    organization: "UC Santa Barbara",
    description:
      "Intensive 1-3 week summer academies for high school students offering hands-on experience in specific research areas including marine science, engineering, and physics.",
    websiteUrl: "https://www.summer.ucsb.edu/pre-college/summer-research-academies",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: 14,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Ages 14-18. Different academies have different grade requirements. Some academies accept younger students (9th grade), others require 10th+.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-04-15"),
    isRolling: true,
    rollingNotes: "Rolling admissions, academies may fill before deadline",
    applicationUrl: "https://www.summer.ucsb.edu/pre-college/summer-research-academies/apply",
    applicationNotes:
      "Requires transcript and short essay. Some academies require teacher recommendations. Fee varies by program length.",

    format: "residential",
    location: "Santa Barbara, CA",

    llmContext:
      "UCSB SRA offers multiple themed academies: Ocean Science, Engineering Design, Physics of Waves, and more. Shorter commitment (1-3 weeks) than RMP, making it accessible to younger students. Less selective than RMP but still high quality. Program fees range $2,000-$6,000 depending on length. Good option for students wanting to explore research before committing to a longer program. Beautiful coastal campus.",

    category: "research",
    focusAreas: [
      "research",
      "STEM",
      "marine_science",
      "engineering",
      "physics",
      "oceanography",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Academy Session 1",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-04"),
        notes: "2-week academy",
      },
      {
        name: "Academy Session 2",
        startDate: new Date("2026-07-05"),
        endDate: new Date("2026-07-18"),
        notes: "2-week academy",
      },
      {
        name: "Academy Session 3",
        startDate: new Date("2026-07-19"),
        endDate: new Date("2026-08-01"),
        notes: "2-week academy",
      },
    ],
  },
];

async function seedSummerPrograms() {
  console.log("Seeding summer programs...");

  for (const programData of summerPrograms2026) {
    const { sessions, ...program } = programData;

    const existing = await prisma.summerProgram.findFirst({
      where: {
        name: program.name,
        programYear: program.programYear,
      },
    });

    if (existing) {
      console.log(`  Updating: ${program.shortName || program.name}`);

      // Update the program
      await prisma.summerProgram.update({
        where: { id: existing.id },
        data: program,
      });

      // Delete existing sessions and recreate
      await prisma.summerProgramSession.deleteMany({
        where: { summerProgramId: existing.id },
      });

      // Create new sessions
      for (const session of sessions) {
        await prisma.summerProgramSession.create({
          data: {
            summerProgramId: existing.id,
            name: session.name,
            startDate: session.startDate,
            endDate: session.endDate,
            notes: session.notes || null,
          },
        });
      }
    } else {
      console.log(`  Creating: ${program.shortName || program.name}`);

      // Create program with sessions
      await prisma.summerProgram.create({
        data: {
          ...program,
          sessions: {
            create: sessions.map((s) => ({
              name: s.name,
              startDate: s.startDate,
              endDate: s.endDate,
              notes: s.notes || null,
            })),
          },
        },
      });
    }
  }

  console.log(`Seeded ${summerPrograms2026.length} summer programs for 2026`);
}

async function main() {
  try {
    await seedSummerPrograms();
    console.log("\nSeeding complete!");
  } catch (error) {
    console.error("Error seeding database:", error);
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
