import { PrismaClient } from "@prisma/client";
import { batchPrograms as batch1Programs } from "./seeds/batch-1-programs";
import { batchPrograms as batch2Programs } from "./seeds/batch-2-programs";

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
      "A free six-week summer program at MIT for high school students who have demonstrated excellence in math and science. Students conduct original research under the mentorship of scientists and researchers at MIT and Boston-area labs.",
    websiteUrl: "https://www.cee.org/programs/rsi",
    programYear: 2026,

    // Eligibility
    minGrade: 11,
    maxGrade: 11,
    minAge: 16,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["AP Calculus BC", "AP Physics C", "AP Chemistry"],
    eligibilityNotes:
      "Must be a current high school junior (rising senior). Must be 16+ by July 1, 2026. U.S. citizens/permanent residents apply directly; international students through country-specific processes. Recommended scores: PSAT Math ≥740, EBRW ≥700; ACT Math ≥33, Verbal ≥34.",

    // Application
    applicationOpens: new Date("2025-10-01"),
    applicationDeadline: new Date("2025-12-10"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.cee.org/programs/rsi/apply",
    applicationNotes:
      "Requires 2-3 teacher recommendations (math/science or research supervisor), official transcript, essays about STEM goals, and standardized test scores (PSAT/SAT/ACT/AP). Application fee $65-75 (waivers available). AI use in applications strictly prohibited.",

    // Details
    format: "residential",
    location: "Cambridge, MA",

    // AI Context
    llmContext:
      "RSI is the most prestigious pre-college STEM program in the US with selectivity comparable to Harvard/Yale/Princeton (~2-3% acceptance rate, 100 accepted from ~3,000 applicants). Program structure: Week 1 intensive STEM classes with professors, Weeks 2-6 individual research projects with mentors at MIT/Boston-area labs, final week written papers and oral presentations. About 10% have no prior research experience - selection based on superior academic achievement, leadership potential, math/science competitions, university coursework, or original research. Outcomes: 90% MIT acceptance rate among alumni, most attend Ivy+. Students publish research and compete in Intel STS, Siemens Competition, ISEF. 100 students total (2/3 U.S., 1/3 international). Completely FREE - covers tuition, room, board, and travel.",

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
        startDate: new Date("2026-06-28"),
        endDate: new Date("2026-08-08"),
      },
    ],
  },

  {
    name: "Summer Science Program",
    shortName: "SSP",
    organization: "Summer Science Program",
    description:
      "An intensive 5-week academic experience for talented high school students. Teams of 3 complete a full research cycle from data collection to analysis in astrophysics, biochemistry, genomics, synthetic chemistry, or cell biology.",
    websiteUrl: "https://summerscience.org",
    programYear: 2026,

    minGrade: 10,
    maxGrade: 11,
    minAge: 15,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["Pre-Calculus", "Physics", "Chemistry", "Biology"],
    eligibilityNotes:
      "Current juniors (rising seniors); sophomores occasionally accepted. Ages 15-18 during program. Prerequisites vary by track: Astrophysics requires physics + precalculus; Biochemistry requires biology + chemistry + strong algebra; Genomics requires biology + Algebra 2; Synthetic Chemistry requires chemistry courses.",

    applicationOpens: new Date("2025-12-20"),
    applicationDeadline: new Date("2026-02-19"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://summerscience.org/apply",
    applicationNotes:
      "FREE application. Personal statement, 2 teacher recommendations (STEM preferred), unofficial transcript. NO standardized test scores required (except English proficiency for international). International deadline January 22, 2026; Domestic deadline February 19, 2026.",

    format: "residential",
    location: "Multiple campuses (UC Boulder, UNC Chapel Hill, New Mexico State, Purdue, Indiana University, others)",

    llmContext:
      "SSP founded 1959, one of oldest residential STEM programs. Received $200M bequest from Qualcomm co-founder Franklin Antonio in 2022. Five research tracks: Astrophysics (asteroid orbit determination), Biochemistry (fungal enzyme inhibition), Bacterial Genomics (antibiotic resistance), Synthetic Chemistry (macrocyclic catalysts), Cell Biology (CRISPR gene editing). 10-15% acceptance rate, ~600-700 students total (36 per campus). Cost $9,800 but FREE for families earning <$75K, discounts for <$140K, $3,000 stipends available for students who need summer earnings. Need-blind, holistic review considering motivation, resources, obstacles overcome. Encourages underrepresented students and first-gen college. Outcomes: 85% attend top-30 universities, 60% at top-10. Strong alumni network (2,500+ alumni). Optional College Link mentorship program.",

    category: "research",
    focusAreas: [
      "STEM",
      "research",
      "astrophysics",
      "biochemistry",
      "genomics",
      "astronomy",
      "chemistry",
      "cell_biology",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Session 1",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-26"),
        notes: "5 weeks",
      },
      {
        name: "Session 2",
        startDate: new Date("2026-07-05"),
        endDate: new Date("2026-08-09"),
        notes: "5 weeks",
      },
    ],
  },

  {
    name: "MIT Online Science, Technology, and Engineering Community",
    shortName: "MOSTEC",
    organization: "MIT Office of Engineering Outreach Programs",
    description:
      "A free six-month online program for rising high school seniors from underrepresented and underserved backgrounds. Three phases: Academic (online courses), Conference (in-person at MIT), and College Prep (fall semester support).",
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
      "Must be current 11th grader. U.S. citizens or permanent residents only. Strongly encourages underrepresented students (African American, Hispanic/Latino, Native American), underserved (low socioeconomic, free/reduced lunch), first-gen college, rural/minority high schools.",

    applicationOpens: new Date("2025-11-15"),
    applicationDeadline: new Date("2026-02-01"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://oeop.mit.edu/programs/mostec/apply",
    applicationNotes:
      "FREE application. Online form with 6-7 short answer essays about STEM goals, challenges, contributions. 3 recommendations (math/science teacher, humanities teacher, school counselor). Unofficial transcript. Standardized test scores optional but encouraged. Recommender deadline February 15, 2026.",

    format: "hybrid",
    location: "Online + Cambridge, MA",

    llmContext:
      "MOSTEC (formerly known as MITES Semester) is part of MIT OEOP programs. Three phases: Academic Phase (June-early August) with 2 online courses in science/engineering/science writing; Conference Phase in-person at MIT; College Prep Phase providing fall semester support. Course options include Astronomy, EECS, Neuroscience & Connectomics, Mobile App Development. Holistic admissions with focus on students who haven't had access to advanced STEM opportunities. Provides college application support throughout fall semester. Strong pathway to MIT admission - MOSTEC scholars have elevated MIT acceptance rates. Completely FREE including all costs and travel.",

    category: "STEM",
    focusAreas: ["STEM", "engineering", "science", "technology", "diversity"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Academic Phase (Online)",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-08-07"),
        notes: "2 online courses",
      },
      {
        name: "On-Campus Conference",
        startDate: new Date("2026-08-10"),
        endDate: new Date("2026-08-17"),
        notes: "In-person at MIT",
      },
      {
        name: "College Prep Phase",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-12-15"),
        notes: "Fall semester support",
      },
    ],
  },

  {
    name: "Stanford Institutes of Medicine Summer Research Program",
    shortName: "SIMR",
    organization: "Stanford Medicine",
    description:
      "An 8-week summer research internship at Stanford for high school students interested in biomedical sciences, health, or medicine. Students work full-time (40 hrs/week) with one-on-one mentors in research labs.",
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
      "Current juniors or seniors (class of 2026 or 2027). Must be 16+ by June 8, 2026. U.S. citizens or permanent residents living in U.S. Strong preference for Bay Area students within 1-hour drive who can commute.",

    applicationOpens: new Date("2025-12-19"),
    applicationDeadline: new Date("2026-02-21"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://simr.stanford.edu/apply",
    applicationNotes:
      "Apply via SlideRoom. 2 essays (interest in biomedical science, how SIMR fits goals), 1 teacher recommendation (science/math preferred), high school transcript. Optional standardized test scores. Application fee $50 (waived for families earning <$80K). Decisions early April 2026.",

    format: "commuter",
    location: "Stanford, CA",

    llmContext:
      "SIMR is a non-residential commuter program - students commute to Stanford daily. <3% acceptance rate (~50 students accepted). FREE tuition; students responsible for housing, meals, transportation. All students receive minimum $500 stipend, $1,500-$2,500+ for students with financial need. 8 research institutes: Immunology, Cancer Biology, Stem Cell Biology, Neuroscience, Cardiovascular Science, Bioengineering, Bioinformatics, Genetics & Genomics. Alternative: Bioengineering Team Internship (hands-on design, no lab component). Full-time lab work 40 hrs/week with one-on-one mentor (faculty/postdoc/grad student). Weekly faculty lectures, workshops on research skills. Final poster symposium. Many students continue research and publish. Strong college admissions boost.",

    category: "research",
    focusAreas: [
      "medicine",
      "research",
      "biology",
      "health",
      "biomedical",
      "science",
      "neuroscience",
      "bioengineering",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-08"),
        endDate: new Date("2026-07-30"),
      },
    ],
  },

  {
    name: "California State Summer School for Mathematics and Science",
    shortName: "COSMOS",
    organization: "University of California",
    description:
      "A 4-week intensive residential program for California students with demonstrated interest and achievement in math and science. Hands-on STEM education in specialized clusters at 6 UC campuses.",
    websiteUrl: "https://cosmos-ucop.ucdavis.edu",
    programYear: 2026,

    minGrade: 8,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: 3.5,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Algebra 2"],
    eligibilityNotes:
      "Rising 9th-12th graders (current 8th-11th graders). CALIFORNIA RESIDENTS ONLY. Must be appropriate age for grade level. Students select 1st and 2nd choice 'cluster' (specialized STEM track).",

    applicationOpens: new Date("2026-01-07"),
    applicationDeadline: new Date("2026-02-06"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://cosmos-ucop.ucdavis.edu/apply",
    applicationNotes:
      "Online application, personal statement, 1-2 teacher recommendations (STEM preferred), unofficial transcript (8th/9th graders also submit 7th/8th grade report cards). Parent/guardian e-signature required. NO standardized test scores. Application fee $44-46. Application closes 5 PM (unsupported after). Decisions March 26, 2026 at 5 PM; acceptance deadline April 8, 2026.",

    format: "residential",
    location: "UC Davis, UC Irvine, UCLA, UC Merced, UC San Diego, or UC Santa Cruz",

    llmContext:
      "COSMOS is California's flagship pre-college STEM program. ~21% overall acceptance rate (some clusters 10%). Typical student has 3.5+ GPA. 6 campuses (UC Davis, UC Irvine, UCLA, UC Merced, UC San Diego, UC Santa Cruz) each offering different clusters in engineering, computer science, biomedical, environmental science, etc. Cluster faculty review applications and select students. Cost $5,518 (2026) with need-based financial aid available (can cover full cost). Can only attend COSMOS once. Recognized by UC system as Academic Preparation Program - special consideration in UC admissions. ~160-200 students per campus (~800-1,000 total). Daily lectures, labs, group projects, field trips, guest speakers. Students live in dorms with structured supervision. Strong community, lifelong friendships. Great option for 9th-10th graders seeking first residential program experience.",

    category: "STEM",
    focusAreas: [
      "STEM",
      "mathematics",
      "science",
      "engineering",
      "research",
      "robotics",
      "marine_biology",
      "computer_science",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-01"),
        notes: "4 weeks, exact dates vary by campus",
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
      "Intensive 2-week ONLINE academic courses for intellectually curious students. 75+ courses across subjects including AI, creative writing, engineering, math, and philosophy.",
    websiteUrl: "https://summerinstitutes.spcs.stanford.edu",
    programYear: 2026,

    minGrade: 8,
    maxGrade: 11,
    minAge: 13,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Current grades 8-11, ages 13-18 during program. Many courses restricted to specific grade ranges. Check individual course prerequisites.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-03-13"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://summerinstitutes.spcs.stanford.edu/apply",
    applicationNotes:
      "Online application with work samples (varies by course), written responses, optional standardized test scores, unofficial transcript. Parent/guardian must submit application with minor student. Financial aid deadline March 20, 2026. Financial aid available for domestic and international students (need-based).",

    format: "online",
    location: "Online (synchronous)",

    llmContext:
      "Stanford Pre-Collegiate Summer Institutes is an ONLINE program (not residential). 75+ online courses across subjects including AI, creative writing, engineering, math, philosophy. Small class sizes with live discussions and real-time interaction. Two 2-week sessions (June-July 2026), Monday-Friday, synchronous daily attendance required. Cost $3,200 tuition plus up to $100 for materials. Courses are ungraded and non-credit. Academically rigorous, college-level content not typically in high school curriculum. Holistic admissions. Students from around world. Note: Separate from Stanford undergraduate admissions - participation doesn't guarantee admission. Also offers Stanford Summer Humanities Institute (residential, 3 weeks, grades 10-11 only) as separate program.",

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
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-06-26"),
        notes: "2-week online session",
      },
      {
        name: "Session 2",
        startDate: new Date("2026-06-29"),
        endDate: new Date("2026-07-10"),
        notes: "2-week online session",
      },
    ],
  },

  {
    name: "Johns Hopkins Center for Talented Youth Summer Programs",
    shortName: "CTY Summer",
    organization: "Johns Hopkins Center for Talented Youth",
    description:
      "Intensive 3-week academic programs for gifted students. 70+ in-person courses in arts, sciences, bioethics, engineering, and public health. Students take one course and dive deep into a subject.",
    websiteUrl: "https://cty.jhu.edu/summer",
    programYear: 2026,

    minGrade: 2,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Grades 2-12. MUST qualify through above-grade-level testing (98th percentile in grade, or 2+ grades above level). Qualifying tests: SCAT, STB, ACT, SAT, PSAT. Testing required before application.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-04-01"),
    isRolling: true,
    rollingNotes: "Course assignment weekly on Fridays after November 29 priority deadline. Popular courses fill quickly.",
    applicationUrl: "https://cty.jhu.edu/summer/apply",
    applicationNotes:
      "Create MyCTY account, establish eligibility through testing or qualifying scores, then enroll in courses. Priority deadline late January. No recommendations required.",

    format: "residential",
    location: "Multiple U.S. sites (Dickinson College, Johns Hopkins, Loyola Marymount, others)",

    llmContext:
      "CTY founded 1979, nonprofit. One of the largest gifted summer programs. Day programs (grades 2-5) and Residential programs (grades 5-12). Students take one intensive course for 3 weeks. 70+ in-person courses in arts, sciences, bioethics, engineering, public health. Expert instructors. Cost $3,099-$6,819 for on-campus programs (2024). Online courses $695-$2,130. Financial aid available - over $2.1M in 2023. CTY Scholars Program provides 4-year support for low-income students. Qualifying test requirement ensures academically prepared peers. Acceptance based on test scores and course availability rather than fixed percentage. Strong alumni network. Good entry point for younger gifted students (middle school).",

    category: "academics",
    focusAreas: [
      "academics",
      "mathematics",
      "science",
      "humanities",
      "writing",
      "computer_science",
      "bioethics",
      "engineering",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Session 1",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-11"),
        notes: "3-week session",
      },
      {
        name: "Session 2",
        startDate: new Date("2026-07-12"),
        endDate: new Date("2026-08-01"),
        notes: "3-week session",
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
      "An intensive 5-week summer program for mathematically talented students. Student-driven curriculum with 100+ classes daily in advanced number theory, topology, combinatorics, and more.",
    websiteUrl: "https://www.mathcamp.org",
    programYear: 2026,

    minGrade: 7,
    maxGrade: 12,
    minAge: 13,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: ["Pre-Calculus"],
    recommendedCourses: [],
    eligibilityNotes:
      "Ages 13-18. Must have completed precalculus. High school juniors/seniors typical, but middle schoolers and gap year students accepted. Qualifying Quiz is the main admission criterion - tests mathematical creativity, not knowledge.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-02-28"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.mathcamp.org/apply",
    applicationNotes:
      "FREE application. Online form, math background information, solutions to Qualifying Quiz (challenging math problems). Optional financial aid application. NO transcripts or standardized test scores required. One recommendation. Decisions mid-April 2026.",

    format: "residential",
    location: "Champlain College, Burlington, Vermont",

    llmContext:
      "Mathcamp founded 1993. Emphasis on mathematical thinking and discovery, NOT competition. Student-driven curriculum - choose from 100+ classes daily. Topics include advanced number theory, topology, combinatorics. Collaborative problem-solving, no grades or tests. Daily schedule includes classes, problem sessions, social activities. 120 students (65 new, 55 returning alumni). Cost $6,600-$7,500 base. FREE for U.S./Canadian families earning <$100K. Need-based aid for middle-income and international students. Travel grants available. Returning alumni automatically welcome. Strong community with democratic governance. Alumni network with reunions. Many alumni become mathematicians and professors. Program conducted entirely in English.",

    category: "mathematics",
    focusAreas: ["mathematics", "problem_solving", "logic", "proofs", "topology", "combinatorics"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-28"),
        endDate: new Date("2026-08-02"),
        notes: "5 weeks, 35 days total",
      },
    ],
  },

  {
    name: "Ross Mathematics Program",
    shortName: "Ross",
    organization: "Ohio State University",
    description:
      "An intensive 6-week summer program focused entirely on number theory explored from first principles. Emphasis on developing mathematical thinking and writing rigorous proofs.",
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
      "Ages 15-18 (occasionally 14 or recent graduates). Pre-college students passionate about mathematics. Application Problems are central to admission decision.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-03-15"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://rossprogram.org/students/apply",
    applicationNotes:
      "FREE application. Online application, school transcripts, teacher recommendations, essays about interests/goals, and solutions to challenging Application Problems. Decisions mid-April 2026.",

    format: "residential",
    location: "Otterbein University (Columbus, OH) and Rose-Hulman Institute (Indiana)",

    llmContext:
      "Ross founded 1957 by Arnold Ross at Notre Dame. Famous motto: 'Think deeply of simple things.' One of three top U.S. math camps (with PROMYS and SUMaC). ~15% acceptance rate (2023). NOT oriented toward math contests - focuses on independent mathematical research and collaboration. First-year students take number theory course. 8 hours formal classes per week, extensive unstructured time for problem-solving. Intensive, immersive experience. Cost $7,000 with financial aid available (goal: enable every accepted student to attend). Students live in dorms, no electronics/games. Approximately 1/3 female. International students welcome (reasonable English fluency required). Alumni include notable mathematicians. Two sites: Otterbein University (Columbus, OH) and Rose-Hulman Institute (Indiana).",

    category: "mathematics",
    focusAreas: ["mathematics", "number_theory", "problem_solving", "proofs"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-14"),
        endDate: new Date("2026-07-25"),
        notes: "6 weeks",
      },
    ],
  },

  {
    name: "Hampshire College Summer Studies in Mathematics",
    shortName: "HCSSiM",
    organization: "Hampshire College",
    description:
      "A 6-week residential program emphasizing mathematical discovery and community. 4 hours morning classes (Mon-Sat), Prime Time Theorem before supper, and 3-hour evening problem sessions.",
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
      "Most students after sophomore/junior year (completed 9th grade with advanced math). Occasionally younger students accepted. Looking for creative mathematical thinking, not just correct answers.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-04-01"),
    isRolling: true,
    rollingNotes: "Application closes when capacity reached",
    applicationUrl: "https://hcssim.org/apply",
    applicationNotes:
      "Letter explaining motivations (why spend 8 hours/day doing math?), sponsor recommendation (someone who knows applicant mathematically), Hampshire College Summer Studies Interesting Test (exam sent after initial application).",

    format: "residential",
    location: "Hampshire College, Amherst, MA",

    llmContext:
      "HCSSiM founded 1971 by David Kelly. 5-7% acceptance rate - highly selective. ~46-51 students. Approximately 50% girls/non-binary students. Uniquely collaborative and playful culture. Workshops first half, then maxi-courses and mini-courses. Collaborative, no grades. Access to faculty at meals and in dorm. Yellow Pig Day (July 17) tradition. Cost $5,780-$6,511. FREE for domestic families earning <$68K-$85K. Financial aid and travel grants available. Alumni include MacArthur Fellows (Eric Lander, Erik Winfree), Lisa Randall, Dana Randall. Strong alumni community with annual reunions. Can only attend once. Emphasis on mathematical discovery and community.",

    category: "mathematics",
    focusAreas: ["mathematics", "problem_solving", "proofs", "logic"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-05"),
        endDate: new Date("2026-08-15"),
        notes: "6 weeks",
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
      "A 7-week summer research program focused on polymer science and materials engineering. Students design original research projects with Garcia Center faculty and present at final research symposium.",
    websiteUrl: "https://www.stonybrook.edu/commcms/garcia/",
    programYear: 2026,

    minGrade: 10,
    maxGrade: 11,
    minAge: 16,
    maxAge: null,
    minGpaUnweighted: 3.8,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: ["Chemistry", "Physics", "Biology", "Calculus"],
    eligibilityNotes:
      "Must be 16+ by July 4, 2026. Unweighted GPA 95/100 (3.8/4.0). Standardized test scores 60th percentile+. Must have taken 3+ of: English, Chemistry, Math/Calculus, Physics, Biology (Honors/AP preferred). International students accepted but program cannot support visas.",

    applicationOpens: new Date("2026-01-01"),
    applicationDeadline: new Date("2026-03-03"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.stonybrook.edu/commcms/garcia/apply.php",
    applicationNotes:
      "Online application (Parts 1 and 2), 3 letters of recommendation (one from science teacher), transcript. Registration fee $50 non-refundable (check or wire transfer to 'SUNY Stony Brook').",

    format: "residential",
    location: "Stony Brook University, NY",

    llmContext:
      "Garcia focuses on polymer science and technology. 10-15% acceptance rate (~90 students accepted). 3 days lab safety training, daily lectures on current research, group experiments. Students design original research projects in polymer science/materials engineering with Garcia Center faculty. Final research symposium with poster presentations. Yearbook with photos and abstracts. Students work in focused research teams, encouraged to publish in journals and present at conferences. Can continue during academic year through Mentor Program. Students have won ISEF, NYCSEF, NYSSEF, received patents. Strong pipeline to Regeneron STS.",

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
        startDate: new Date("2026-06-29"),
        endDate: new Date("2026-08-14"),
        notes: "7 weeks",
      },
    ],
  },

  {
    name: "Simons Summer Research Program",
    shortName: "Simons",
    organization: "Stony Brook University",
    description:
      "A 6-week summer research program pairing high school juniors with Stony Brook faculty mentors. Students join research groups and assume responsibility for real research projects in science, math, or engineering.",
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
      "Current 11th graders ONLY. MUST be nominated by high school (max 2 students per school). School nomination deadline January 30, 2026.",

    applicationOpens: new Date("2025-11-01"),
    applicationDeadline: new Date("2026-02-05"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.stonybrook.edu/simons/application.php",
    applicationNotes:
      "School nomination required first. Online application, unofficial transcript, 2 teacher recommendations (math/science preferred). Optional 3rd recommendation from research supervisor if prior research experience >4 weeks. Select top 3 research mentor preferences. Recommendation deadline February 13, 2026.",

    format: "commuter",
    location: "Stony Brook University, NY",

    llmContext:
      "Simons established 1984, originally local program now national. Supported by Simons Foundation. Highly selective/competitive. FREE program with stipend provided at closing symposium. Non-residential (commuter) - cannot accommodate remote placements. Matched with Stony Brook faculty mentor, join research group, assume responsibility for project. Minimum 4 hours/day. Weekly faculty research talks, workshops, tours, events. Produce written research abstract and poster. Final poster symposium. Students gain hands-on research experience in science, math, or engineering. Strong mentorship from faculty. Many alumni become Regeneron STS finalists.",

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
        startDate: new Date("2026-06-29"),
        endDate: new Date("2026-08-07"),
        notes: "6 weeks",
      },
    ],
  },

  {
    name: "Boston University Research in Science & Engineering",
    shortName: "BU RISE",
    organization: "Boston University",
    description:
      "A 6-week summer research program with two tracks: Internship (40 hrs/week research with faculty mentor) or Practicum (structured group research in Computational Neurobiology or Data Science).",
    websiteUrl: "https://www.bu.edu/summer/high-school-programs/rise/",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: ["Biology", "Chemistry", "Physics"],
    eligibilityNotes:
      "Current juniors (entering senior year fall 2026). U.S. citizens or permanent residents only.",

    applicationOpens: new Date("2025-12-01"),
    applicationDeadline: new Date("2026-02-04"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.bu.edu/summer/high-school-programs/rise/apply/",
    applicationNotes:
      "Online application, high school transcript (must include fall 2025 grades), optional standardized test scores, 1 teacher recommendation, essays, financial aid documents if applying for aid. Application fee $75. Recommendation deadline February 11, 2026. Decisions 6-8 weeks after deadline.",

    format: "residential",
    location: "Boston University, Boston, MA",

    llmContext:
      "BU RISE has 45 years of providing research opportunities. Two tracks: Internship (40 hrs/week research with faculty/postdoc/grad student mentor in astronomy, biology, biomedical engineering, chemistry, computer science, engineering, neuroscience, physics, psychology, public health) or Practicum (structured group research - 2-hour morning lecture, 4-hour afternoon lab in Computational Neurobiology or Data Science). Competitive matching process for Internship track. Daily lab work 9am-5pm, weekly workshops, final poster symposium. Social activities with other BU summer programs (HSH, AIM). Cost: Commuter ~$6,185, Residential ~$10,289 (2025 estimates). $1,000 non-refundable deposit upon acceptance. Need-based financial aid available. Students live in dorms with ~100-200 other summer students. Certificate of completion (non-credit).",

    category: "research",
    focusAreas: [
      "research",
      "STEM",
      "science",
      "engineering",
      "neuroscience",
      "biology",
      "data_science",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-14"),
        notes: "6 weeks",
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
      "A rigorous 4-week summer program for high school juniors who identify as women. Hands-on classes, labs, and team-based projects taught by MIT grad students in mechanical engineering.",
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
      "Current 11th graders (rising seniors). Must live in U.S. year-round. Women-focused program for students underrepresented/underserved in engineering. NO prior engineering experience required (actually preferred to have little/none). Physics and calculus NOT prerequisites.",

    applicationOpens: new Date("2025-12-01"),
    applicationDeadline: new Date("2026-01-15"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://wtp.mit.edu/apply",
    applicationNotes:
      "FREE application via SlideRoom. 2 teacher evaluations (one math, one science - online forms, NOT letters), transcript, essays. Teacher reference deadline typically 1-2 weeks after application. Decisions mid-April 2026.",

    format: "residential",
    location: "MIT Campus, Cambridge, MA",

    llmContext:
      "WTP created 2002 (EECS), 2006 (ME). Highly selective - 320 applications for 20 spots in 2024. Currently only Mechanical Engineering track (EECS track on hiatus). ~20 students. Designed for students with strong math/science but no engineering background and few opportunities to explore. Daily classes Mon-Fri 9:30am-5pm, some evening/weekend activities. Taught by MIT grad students, assisted by undergrads. Focus on mechanical engineering fundamentals. Strongly encourages African American, Hispanic, Native American applicants. Holistic review - all applicants reviewed equitably regardless of race/ethnicity. Students should be able to handle college-level material at rapid pace. FREE for families earning <$120K/year. Fees for higher incomes listed on website. Living on MIT campus. Strong pathway to MIT admission - many WTP alumni attend MIT.",

    category: "engineering",
    focusAreas: [
      "engineering",
      "mechanical_engineering",
      "women_in_STEM",
      "robotics",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-05"),
        endDate: new Date("2026-08-01"),
        notes: "4 weeks",
      },
    ],
  },

  {
    name: "QuestBridge College Prep Scholars",
    shortName: "QuestBridge CPS",
    organization: "QuestBridge",
    description:
      "A free year-round program that connects high-achieving high school juniors from low-income backgrounds with educational and scholarship opportunities, including summer program scholarships and college fly-ins.",
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
      "Household income typically under $65,000 for family of 4 with minimal assets (higher incomes with significant circumstances considered). Must be current junior attending high school in U.S., or U.S. Citizen/Permanent Resident abroad. Should be earning primarily A's in most challenging courses, rank in top 5-10%, strong writing ability. Often qualify for free/reduced-price school meals.",

    applicationOpens: new Date("2026-02-01"),
    applicationDeadline: new Date("2026-03-23"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl:
      "https://www.questbridge.org/high-school-students/college-prep-scholars/apply",
    applicationNotes:
      "FREE application. Online application, financial documents, transcript, test scores (optional, holistic review), School Profile if available, core subject teacher reference. Decisions late April 2026.",

    format: "hybrid",
    location: "Online + partner college campuses",

    llmContext:
      "QuestBridge CPS isn't a traditional summer program - it's a pathway program with 55 college partners. Awards include: summer program scholarships at partner colleges, Quest for Excellence Awards ($500), National College Admissions Conferences, free college visits, personalized resources and guidance, community of motivated peers. Key stat: College Prep Scholars are over 7x more likely than other applicants to receive full four-year scholarships through the National College Match as seniors. 3,657 juniors selected as scholars in 2025. Holistic approach with no absolute criteria or cut-offs. Provides early head start on preparing for top college applications. Essential for low-income, high-achieving students.",

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
        notes: "Includes summer program scholarships at partner colleges and college fly-in programs",
      },
    ],
  },

  // =============================================================================
  // HUMANITIES & LEADERSHIP PROGRAMS
  // =============================================================================
  {
    name: "Telluride Association Summer Seminar",
    shortName: "TASS",
    organization: "Telluride Association",
    description:
      "A free 5-week educational experience for high school sophomores and juniors focused on critical thinking, democratic community, and intellectual exploration through college-level seminars in Critical Black Studies or Anti-Oppressive Studies.",
    websiteUrl: "https://www.tellurideassociation.org/our-programs/high-school-students/tass/",
    programYear: 2026,

    minGrade: 10,
    maxGrade: 11,
    minAge: 15,
    maxAge: 17,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Current sophomores and juniors (rising juniors and seniors). Ages 15-17 during program. U.S. and international students welcome. Looking for intellectually curious, community-minded, self-motivated students. Welcomes Black, Indigenous, students of color, students with economic hardship.",

    applicationOpens: new Date("2025-10-15"),
    applicationDeadline: new Date("2025-12-03"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.tellurideassociation.org/our-programs/high-school-students/tass/apply/",
    applicationNotes:
      "FREE to attend. Online application with essays (most important component - show personality, critical thinking, curiosity about social/political issues). Attestation of no AI use required. Must commit to full program with no other employment/classes during program. Interview notification January 2026, interviews February 2026, decisions March 2026.",

    format: "residential",
    location: "Two programs (can only apply to one)",

    llmContext:
      "TASS (formerly TASP for seniors, TASS for sophomores/juniors - restructured 2022) is the premier humanities summer program. Two residential tracks: TASS-CBS (Critical Black Studies) explores history, politics, literature, art, contributions from people of African descent; TASS-AOS (Anti-Oppressive Studies) examines how power shapes social structures through literature, history, art. Students live in self-governing democratic community with 3-hour college-level seminars daily (weekdays), discussions, small-group work, lectures, films, art. Essay writing with instructor feedback. Low-tech policy (restricted phone/laptop use). COMPLETELY FREE (tuition, books, room, board, field trips, facilities). Additional financial aid available for travel costs and to replace summer job earnings. Highly selective. Need-blind admissions. Strong emphasis on critical thinking and democratic community. Note: Some controversy about program restructuring and atmosphere.",

    category: "humanities",
    focusAreas: [
      "humanities",
      "philosophy",
      "critical_thinking",
      "leadership",
      "literature",
      "social_sciences",
      "diversity",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "TASS-CBS (Critical Black Studies)",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-25"),
        notes: "5 weeks",
      },
      {
        name: "TASS-AOS (Anti-Oppressive Studies)",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-25"),
        notes: "5 weeks",
      },
    ],
  },

  {
    name: "LaunchX Entrepreneurship Program",
    shortName: "LaunchX",
    organization: "LaunchX",
    description:
      "Multiple entrepreneurship programs for high school students: from 3-week part-time bootcamps to 4-week intensive in-person programs. Students develop and launch real startups, consult for organizations, or intern at startups.",
    websiteUrl: "https://launchx.com/summer-program/",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: 14,
    maxAge: 22,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "High school students ages 14-18. Online Startup Experience also open to ages 18-22. Looking for entrepreneurial mindset and initiative, not prior business experience.",

    applicationOpens: new Date("2025-10-01"),
    applicationDeadline: new Date("2026-03-04"),
    isRolling: true,
    rollingNotes: "Priority deadline November 12, 2025. Early deadline January 7, 2026. Financial Award deadline February 11, 2026. Final deadline March 4, 2026. Application fee reduced for early applications.",
    applicationUrl: "https://launchx.com/apply/",
    applicationNotes:
      "Online application with information about entrepreneurship experience, student background, problem-solving demonstration. No recommendations required. Can mix and match programs within same season.",

    format: "hybrid",
    location: "Boston (in-person), San Diego (in-person), or Online",

    llmContext:
      "LaunchX founded at MIT offers year-round entrepreneurship programming. Programs: BootCamp (3 weeks, part-time, online, $1,995), Startup Internship (8 weeks, part-time, $4,495), Innovation Consulting (3 weeks, full-time, $4,995), Online Entrepreneurship (5 weeks, full-time, online, $6,495), San Diego Innovation (2 weeks, in-person, $6,495), In-Person Entrepreneurship Boston (4 weeks, in-person, $11,495). ~30% acceptance rate. Students start real businesses, consult for existing organizations, or intern at startups. Curriculum designed by academic experts and practitioners. Team-based work with mentorship from industry professionals. Notable alumni include Zepto founder (now $5B valuation), Avalon founder. Financial awards available. Focus on practical application beyond theory.",

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
        name: "In-Person Boston Session 1",
        startDate: new Date("2026-06-29"),
        endDate: new Date("2026-07-26"),
        notes: "4 weeks, $11,495",
      },
      {
        name: "In-Person Boston Session 2",
        startDate: new Date("2026-07-27"),
        endDate: new Date("2026-08-23"),
        notes: "4 weeks, $11,495",
      },
      {
        name: "San Diego Innovation",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-07-18"),
        notes: "2 weeks, $6,495",
      },
    ],
  },

  {
    name: "Bank of America Student Leaders",
    shortName: "Student Leaders",
    organization: "Bank of America",
    description:
      "A paid 8-week summer internship connecting high school juniors and seniors with nonprofits in their communities, plus an all-expenses-paid Student Leaders Summit in Washington D.C.",
    websiteUrl:
      "https://aboutus.bankofamerica.com/studentleaders",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 12,
    minAge: 16,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_only",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Current juniors or seniors in high school. Must be legally authorized to work in U.S. without sponsorship through September 2026. Must be able to work 35 hours/week for 8 weeks. Must permanently reside in eligible county (extensive list covering most major metro areas). Must be student in good standing, not previously selected, not Bank of America employee or immediate family.",

    applicationOpens: new Date("2025-10-14"),
    applicationDeadline: new Date("2026-01-15"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl:
      "https://aboutus.bankofamerica.com/studentleaders",
    applicationNotes:
      "FREE application via CyberGrants. 1 letter of recommendation (MUST be from administrator/teacher/guidance counselor/coach at current school, on school letterhead, signed, PDF format). Optional resume (2 pages max). Virtual info session January 7, 2026 at 4 PM. Some markets conduct interviews before end of March. Decisions by April 2026. NO exceptions or extensions on deadline.",

    format: "commuter",
    location: "Local nonprofit placement + Washington D.C. Summit",

    llmContext:
      "Student Leaders places ~300 students nationwide annually from nearly 100 communities at local nonprofits like Boys & Girls Clubs, Habitat for Humanity, United Way. 8-week paid internship ($20-24/hour depending on location) plus all-expenses-paid Student Leaders Summit in Washington D.C. (July 21-26, 2026). Summit explores how government, business, and nonprofits collaborate. Learn civic, social, and business leadership skills. Program has run for 20+ years as part of Bank of America's youth employment and economic mobility efforts. All expenses paid for Summit including travel, lodging, meals, baggage fees. Excellent networking opportunity. Real-world work experience with pay. Strong for college applications showing leadership and community service.",

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
        name: "Local Nonprofit Internship",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2026-07-31"),
        notes: "8 weeks, 35 hours/week, $20-24/hour",
      },
      {
        name: "Student Leaders Summit",
        startDate: new Date("2026-07-21"),
        endDate: new Date("2026-07-26"),
        notes: "All-expenses-paid week in Washington D.C.",
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
      "A highly competitive 6-week summer program for high school students to conduct individual research under the mentorship of UCSB graduate students, postdocs, or faculty. Earn 8 university credits.",
    websiteUrl: "https://summer.ucsb.edu/programs/research-mentorship-program",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: 3.8,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Current 10th or 11th graders (outstanding 9th graders case-by-case). Minimum 3.80 academic weighted GPA. Must attend entire program, cannot enroll in other courses/activities/programs during RMP. TOEFL/English proficiency NOT required for international students.",

    applicationOpens: new Date("2025-12-15"),
    applicationDeadline: new Date("2026-03-09"),
    isRolling: true,
    rollingNotes: "Rolling decisions approximately 3-6 weeks after application completion.",
    applicationUrl: "https://summer.ucsb.edu/programs/research-mentorship-program/apply",
    applicationNotes:
      "Application fee $75 (non-refundable). Transcript (must include Fall 2025 grades), AP Scores (optional), Personal Statement (500 words max - propose a process-based research question), 4 short responses (150 words each). NO recommendations required for 2026.",

    format: "residential",
    location: "UC Santa Barbara, CA",

    llmContext:
      "UCSB RMP is one of the most prestigious high school research programs in California. 4-6% acceptance rate. Over 25 years of operation. Multi-day virtual component, then 6-week in-person experience. Paired with mentor (grad student, postdoc, or faculty). 35-50 hours/week research across wide range of disciplines. GRIT talks lecture series. Earn 8 university credits through 2 courses (Introduction to Research, Presentation Techniques). Final research paper and symposium presentation. Cost: Commuter $4,975 ($75 app + $800 deposit + $4,100 tuition/fees), Residential $11,874 (adds $6,899 housing/meals). Limited need-based scholarships with priority to California residents. Students actively conduct research, utilize library, participate in fieldwork, engage in data collection. Can continue research remotely during school year with mentor consent. Research can be used for competitions and college applications with permission. Strong college admissions boost.",

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
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-07-31"),
        notes: "6 weeks on campus + virtual component. Commuter $4,975, Residential $11,874.",
      },
    ],
  },

  {
    name: "UCSB Summer Research Academies",
    shortName: "UCSB SRA",
    organization: "UC Santa Barbara",
    description:
      "A 4-week selective summer program with 12 research tracks where students work in teams of 3 to develop research questions and conduct hands-on labs. Earn 4 university credits.",
    websiteUrl: "https://summer.ucsb.edu/programs/summer-research-academies",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: 3.6,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Current 9th, 10th, or 11th graders. Minimum 3.60 academic weighted GPA. Must attend entire program, cannot enroll in other courses/activities/programs during SRA. TOEFL/English proficiency NOT required for international students.",

    applicationOpens: new Date("2025-12-15"),
    applicationDeadline: new Date("2026-03-23"),
    isRolling: true,
    rollingNotes: "Rolling decisions approximately 3-5 weeks after application completion.",
    applicationUrl: "https://summer.ucsb.edu/programs/summer-research-academies/apply",
    applicationNotes:
      "Application fee $75 (non-refundable). Transcript (must include Fall 2025 grades), Personal Statement (500 words max - why chosen track interests you, what questions excited to explore), 4 short responses (150 words each). NO recommendations required.",

    format: "residential",
    location: "UC Santa Barbara, CA",

    llmContext:
      "UCSB SRA offers 12 research tracks for 2026: Probabilistic Computing (ML, energy-efficient AI), Homo Technologicus (philosophy of technology), Invisible Cities (urban data analysis, bias), The Gene Edit (CRISPR, gene editing), Photon Forge (photonics, integrated optical circuits), Digital Frontlines (online social movements), Molecular Vision (structural biology, cryoEM), Modeling Impact (policy analysis, demographics), Moral Medicine (bioethics), Rethinking AI (history/philosophy of AI), Expression Intelligence (facial expression analysis), Robotics Revealed (robotics dynamics/control). More accessible than RMP (lower GPA requirement, open to 9th graders). Group-based research (teams of 3) vs. individual in RMP. Welcome Event, Academic Intensive, then 4 weeks on campus. 25-40 hours/week research. GRIT talks lecture series. Earn 4 university credits. Final capstone seminar presentation. Cost: Commuter $3,475 ($75 app + $900 deposit + $2,500 tuition/fees), Residential $9,874 (adds $6,399 housing/meals). Limited need-based scholarships with priority to California residents. Students become registered UCSB students with access to campus facilities. Research can be continued remotely with instructor consent. Good stepping stone before applying to more competitive programs.",

    category: "research",
    focusAreas: [
      "research",
      "STEM",
      "AI",
      "bioethics",
      "robotics",
      "biology",
      "philosophy",
      "data_science",
    ],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-26"),
        endDate: new Date("2026-07-24"),
        notes: "4 weeks. Commuter $3,475, Residential $9,874.",
      },
    ],
  },
];

async function seedSummerPrograms() {
  console.log("Seeding summer programs...");

  // Combine all program batches
  const allPrograms = [
    ...summerPrograms2026,
    ...batch1Programs,
    ...batch2Programs,
  ];

  for (const programData of allPrograms) {
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

  console.log(`Seeded ${allPrograms.length} summer programs for 2026`);
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
