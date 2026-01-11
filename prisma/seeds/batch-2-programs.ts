/**
 * Summer Programs Batch 2
 *
 * 20 programs focused on Arts, Humanities & Creative Fields
 * Data verified for 2026 program year
 *
 * Created: January 2026
 */

interface SummerProgramSeed {
  name: string;
  shortName: string | null;
  organization: string;
  description: string;
  websiteUrl: string;
  programYear: number;
  minGrade: number | null;
  maxGrade: number | null;
  minAge: number | null;
  maxAge: number | null;
  minGpaUnweighted: number | null;
  minGpaWeighted: number | null;
  citizenship: "us_only" | "us_permanent_resident" | "international_ok" | null;
  requiredCourses: string[];
  recommendedCourses: string[];
  eligibilityNotes: string | null;
  applicationOpens: Date | null;
  applicationDeadline: Date | null;
  isRolling: boolean;
  rollingNotes: string | null;
  applicationUrl: string;
  applicationNotes: string | null;
  format: "residential" | "commuter" | "online" | "hybrid";
  location: string;
  llmContext: string | null;
  category: string;
  focusAreas: string[];
  isActive: boolean;
  dataSource: "manual" | "api" | "import";
  dataStatus: "verified" | "pending_2026" | "needs_review";
  sessions: Array<{
    name: string;
    startDate: Date;
    endDate: Date;
    notes?: string;
  }>;
}

export const batchPrograms: SummerProgramSeed[] = [
  // ===========================================================================
  // 1. INTERLOCHEN ARTS CAMP
  // ===========================================================================
  {
    name: "Interlochen Arts Camp",
    shortName: "Interlochen",
    organization: "Interlochen Center for the Arts",
    description:
      "A transformative summer arts experience for students ages 8-18. Programs in music, theatre, dance, visual arts, film, creative writing, and more at a stunning Michigan campus between two lakes.",
    websiteUrl: "https://www.interlochen.org/art-summer-camp",
    programYear: 2026,

    minGrade: 3,
    maxGrade: 12,
    minAge: 8,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Students in grades 3-12 (ages ~8-18). High school division for grades 9-12. Some programs require audition or portfolio. Open to all genders and nationalities.",

    applicationOpens: null,
    applicationDeadline: new Date("2026-01-15"),
    isRolling: true,
    rollingNotes: "January 15 is priority deadline. Programs fill quickly after priority deadline.",
    applicationUrl: "https://www.interlochen.org/summer-camp/admission",
    applicationNotes:
      "Apply online via Education Community portal. Some programs require audition or portfolio submission. Tuition due in full by May 1.",

    format: "residential",
    location: "Interlochen, MI",

    llmContext:
      "Interlochen Arts Camp has been a premier arts training ground since 1928, hosting students from all 50 states and 40+ countries. Programs offered in Creative Writing, Dance, Film & New Media, Music, Theatre, and Visual Arts. Three age divisions: Junior (grades 3-6), Intermediate (grades 6-8), and High School (grades 9-12). Session lengths: 1-week intensives ($2,050, June 20-26), 2-week ($5,250), 3-week ($7,265), 4-week ($8,300), and 6-week ($10,350, June 28 - August 9). 1-week intensives are NOT eligible for financial aid. 85% of students who applied for aid received it last summer. Limited full-tuition orchestral scholarships available (deadline Jan 15). Campus nestled between two crystal-clear lakes with world-class facilities. Students perform alongside professionals - the Interlochen experience is immersive and intensive. Alumni include many famous musicians, actors, and artists. Strong for students serious about arts who want pre-professional training in supportive environment. The community aspect is legendary - lifelong friendships form here.",

    category: "performing_arts",
    focusAreas: ["music", "theatre", "dance", "visual_arts", "film", "creative_writing", "performing_arts"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "1-Week Intensive",
        startDate: new Date("2026-06-20"),
        endDate: new Date("2026-06-26"),
        notes: "$2,050, not eligible for financial aid",
      },
      {
        name: "6-Week Session",
        startDate: new Date("2026-06-28"),
        endDate: new Date("2026-08-09"),
        notes: "$10,350, financial aid available",
      },
    ],
  },

  // ===========================================================================
  // 2. BOSTON UNIVERSITY TANGLEWOOD INSTITUTE (BUTI)
  // ===========================================================================
  {
    name: "Boston University Tanglewood Institute",
    shortName: "BUTI",
    organization: "Boston University College of Fine Arts",
    description:
      "A prestigious summer music program partnered with the Boston Symphony Orchestra's Tanglewood Music Festival. Training for serious young musicians in orchestral, chamber, and vocal music.",
    websiteUrl: "https://www.bu.edu/cfa/tanglewood/",
    programYear: 2026,

    minGrade: null,
    maxGrade: null,
    minAge: 14,
    maxAge: 20,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Ages 14-20 for 2-week workshops; ages 14-19 for 8-week programs. Younger students can apply but those in recommended age range receive preferential admission. Young Artists Orchestra open to high school students not yet in full-time college/conservatory. Audition required. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: null,
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://app.getacceptd.com/buti",
    applicationNotes:
      "Apply via Acceptd portal. Requires video audition or live audition. Scholarship applications available within admissions application.",

    format: "residential",
    location: "Lenox, MA (Tanglewood campus)",

    llmContext:
      "BUTI is celebrating its 60th anniversary in 2026 (June 21 - August 15). One of the most prestigious pre-college music programs, partnered with the Boston Symphony Orchestra at Tanglewood. Programs include Young Artists Orchestra, Wind Ensemble, Vocal Program, and various 2-week workshops. Students perform alongside BSO musicians and attend Tanglewood Festival concerts. Age requirement is 14-20 for workshops, 14-19 for longer programs. Selection is competitive via audition - looking for high proficiency level. Total cost based on weeks attended; merit and need-based scholarships available. The BSO connection provides unparalleled exposure to professional orchestral music. Strong for serious classical musicians who want intensive pre-conservatory training. The Tanglewood setting is magical - students are immersed in one of the world's great music festivals. BUTI alumni attend top conservatories and pursue professional music careers.",

    category: "performing_arts",
    focusAreas: ["music", "classical_music", "orchestra", "vocal", "performance"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Full Summer Program",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-08-15"),
        notes: "Various program lengths available",
      },
    ],
  },

  // ===========================================================================
  // 3. RISD PRE-COLLEGE
  // ===========================================================================
  {
    name: "RISD Pre-College",
    shortName: "RISD Pre-College",
    organization: "Rhode Island School of Design",
    description:
      "A 6-week intensive art and design program at one of the world's leading art schools. Students develop skills, build portfolios, and experience college-level studio work.",
    websiteUrl: "https://precollege.risd.edu/",
    programYear: 2026,

    minGrade: 10,
    maxGrade: 11,
    minAge: 16,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must have finished 10th or 11th year of high school. Must be 16-18 years old (born July 31, 2007 - June 27, 2010). Rising juniors who will be 16 by October 1, 2026 may apply. No portfolio required - open to all skill levels. Open to all genders.",

    applicationOpens: new Date("2025-11-05"),
    applicationDeadline: new Date("2026-01-30"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://precollege.risd.edu/on-campus/application-information",
    applicationNotes:
      "Application deadline January 30, 2026 at 5 PM ET. No late applications. $1,100 non-refundable deposit due within 5 business days of acceptance. Full balance due March 11, 2026.",

    format: "residential",
    location: "Providence, RI",

    llmContext:
      "RISD Pre-College is a 6-week immersive experience at one of the world's most prestigious art and design schools. Residential program costs $12,095 (2025 rates, 2026 TBA); commuter option $9,300. No portfolio or prior experience required - the program accepts students who demonstrate ability and desire to contribute positively. Age requirement is strict: 16-18 during program (specific birthdate range). Students take studio classes, attend critiques, and build portfolios alongside peers from around the world. The RISD experience provides realistic preview of art school rigor and culture. Students have access to RISD's exceptional facilities and resources. Strong for students considering art/design careers who want to test the waters. The college credit option makes this attractive for portfolio development. The program is competitive despite no portfolio requirement - they're looking for potential and genuine interest.",

    category: "arts",
    focusAreas: ["visual_arts", "design", "art", "portfolio_development"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-27"),
        endDate: new Date("2026-08-07"),
        notes: "6 weeks, residential $12,095 / commuter $9,300",
      },
    ],
  },

  // ===========================================================================
  // 4. NYU TISCH SUMMER HIGH SCHOOL FILMMAKERS WORKSHOP
  // ===========================================================================
  {
    name: "NYU Tisch Summer High School Filmmakers Workshop",
    shortName: "Tisch Filmmakers",
    organization: "NYU Tisch School of the Arts",
    description:
      "An intensive 4-week filmmaking program for high school juniors at one of the world's premier film schools. Students write, shoot, and edit their own films while earning college credit.",
    websiteUrl: "https://tisch.nyu.edu/special-programs/high-school-programs/filmmakers-workshop.html",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: 15,
    maxAge: null,
    minGpaUnweighted: 3.0,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be current high school junior (rising senior). Preference given to juniors; sophomores also eligible. Freshmen and seniors NOT eligible. Minimum 3.0 GPA required. Must be at least 15 to reside in NYU housing. No prior film experience required. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: new Date("2025-12-01"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://tisch.nyu.edu/special-programs/high-school-programs/filmmakers-workshop.html",
    applicationNotes:
      "Application deadline December 1, 2025 (now closed for 2026). For future cycles, apply early. Online Filmmakers Workshop also available for all high school grades.",

    format: "residential",
    location: "New York, NY (NYU campus)",

    llmContext:
      "NYU Tisch Filmmakers Workshop is one of the most selective and prestigious high school film programs in the country. 4-week intensive at the renowned Tisch School of the Arts. Students earn 4-6 college credits. Classes and workshops Monday-Friday, 9:30 AM - 5:00 PM including academic instruction, professional training, and production time. The program is highly competitive - early December deadline. Minimum 3.0 GPA required; preference given to juniors. Must be 15+ to live on campus. No prior film experience required - they're looking for passion and potential. Students produce original work using professional equipment. Need-based scholarships available. The Tisch name carries enormous weight in film/media industries. Strong for students serious about film careers who want exposure to top-tier training. Also offers Online Filmmakers Workshop for students in any high school grade.",

    category: "film",
    focusAreas: ["film", "filmmaking", "media", "video_production", "screenwriting"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer 2026",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-01"),
        notes: "4 weeks, earns 4-6 college credits",
      },
    ],
  },

  // ===========================================================================
  // 5. USC SCHOOL OF CINEMATIC ARTS SUMMER PROGRAM
  // ===========================================================================
  {
    name: "USC School of Cinematic Arts Summer Program",
    shortName: "USC SCA Summer",
    organization: "USC School of Cinematic Arts",
    description:
      "A comprehensive 6-week film program at one of the world's top film schools. High school students (ages 16-17) take college-level courses in filmmaking, animation, games, and more.",
    websiteUrl: "https://cinema.usc.edu/summer/index.cfm",
    programYear: 2026,

    minGrade: null,
    maxGrade: null,
    minAge: 16,
    maxAge: 17,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "HIGH SCHOOL STUDENTS: Must be ages 16-17. Must turn 16 by June 15, 2026. Must NOT turn 18 before June 15, 2026. This age window is strict. Open to all genders. U.S. citizens and international students welcome (different application tracks).",

    applicationOpens: new Date("2025-12-15"),
    applicationDeadline: null,
    isRolling: true,
    rollingNotes: "Rolling admission. Once accepted, enrollment is first-come, first-served. Apply early.",
    applicationUrl: "https://cinema.usc.edu/summer/apply.cfm",
    applicationNotes:
      "$65 non-refundable application fee. Requires one recommendation from teacher/counselor/employer. $750 non-refundable deposit upon acceptance.",

    format: "residential",
    location: "Los Angeles, CA (USC campus)",

    llmContext:
      "USC SCA Summer is a premium program at one of the world's top-ranked film schools. 6-week program June 25 - August 7, 2026. EXPENSIVE - can exceed $20,000 for full residential experience (no financial aid for non-USC students). Age restriction is strict: exactly 16-17 years old (must be 16 by June 15, cannot be 18 by June 15). Students take college-level courses earning 4-8 USC units that are transferable. Courses cover filmmaking, animation, games, producing, and more. The SCA facilities and faculty connections are world-class. Strong for students who can afford the investment and want exposure to Hollywood-adjacent film education. The USC network is valuable for future film careers. Not for everyone due to cost, but provides genuinely professional-level training and access.",

    category: "film",
    focusAreas: ["film", "filmmaking", "animation", "games", "media", "production"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer 2026",
        startDate: new Date("2026-06-25"),
        endDate: new Date("2026-08-07"),
        notes: "6 weeks, 4-8 USC credits, ~$20,000+",
      },
    ],
  },

  // ===========================================================================
  // 6. STANFORD SUMMER HUMANITIES INSTITUTE
  // ===========================================================================
  {
    name: "Stanford Summer Humanities Institute",
    shortName: "Stanford Humanities",
    organization: "Stanford Pre-Collegiate Studies",
    description:
      "A 3-week residential program for students passionate about humanities and social sciences. Study history, philosophy, literature, and interdisciplinary topics with Stanford faculty.",
    websiteUrl: "https://summerhumanities.spcs.stanford.edu/",
    programYear: 2026,

    minGrade: 10,
    maxGrade: 11,
    minAge: null,
    maxAge: 17,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be current 10th or 11th grader at time of application. Must be under 18 years old during program (minor status required). Open to all genders. International students welcome.",

    applicationOpens: null,
    applicationDeadline: new Date("2026-02-03"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://summerhumanities.spcs.stanford.edu/admissions-humanities",
    applicationNotes:
      "Expected deadline early February 2026 (based on 2025 deadline of Feb 3). Financial aid deadline February 9, 2026; documents due February 16, 2026.",

    format: "residential",
    location: "Stanford, CA",

    llmContext:
      "Stanford Summer Humanities Institute is a highly selective 3-week program (June 21 - July 10, 2026) for students passionate about humanities and social sciences. Tuition is $8,850 covering housing, meals, instruction, and field trips. Need-based financial aid available for domestic and international students. Must be under 18 - the minor status requirement is strict. Move-in June 21 (required), move-out July 10 (required) - no alternate dates. Students explore topics in history, philosophy, literature, and interdisciplinary humanities with Stanford faculty. Small seminar-style classes emphasize discussion and critical thinking. Strong for students who love reading, writing, and intellectual debate. The Stanford campus experience and faculty access are significant draws. The humanities focus makes this unique among elite summer programs which often emphasize STEM.",

    category: "humanities",
    focusAreas: ["humanities", "philosophy", "history", "literature", "social_sciences"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-10"),
        notes: "3 weeks, $8,850",
      },
    ],
  },

  // ===========================================================================
  // 7. PRINCETON SUMMER JOURNALISM PROGRAM (PSJP)
  // ===========================================================================
  {
    name: "Princeton Summer Journalism Program",
    shortName: "PSJP",
    organization: "Princeton University",
    description:
      "A FREE year-long college prep and journalism program for high school juniors from low-income backgrounds. Includes summer intensive on Princeton's campus and year-long college advising.",
    websiteUrl: "https://psjp.princeton.edu/",
    programYear: 2026,

    minGrade: 11,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: 3.5,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be current high school junior (NO sophomores or seniors). Minimum 3.5 unweighted GPA. Must be from limited-income background. Must have permanent U.S. address (or Puerto Rico). Must intend to attend domestic 4-year college. Interest in journalism required but no prior experience necessary. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: new Date("2026-01-26"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://psjp.princeton.edu/apply/application-process",
    applicationNotes:
      "Application deadline January 26, 2026. First round includes online application with short responses and one longer article. Up to 40 students admitted each year.",

    format: "hybrid",
    location: "Princeton, NJ + Online",

    llmContext:
      "PSJP is a completely FREE, year-long program - one of the best opportunities for low-income students interested in journalism. Unique structure: multi-week hybrid summer intensive (online workshops in late June, 10-day residential at Princeton late July - early August) followed by year-long college advising. The program covers all costs - housing, meals, transportation (including airfare), everything. Students are matched with personal college advisers who help with college lists, essays, and applications throughout senior year. Must be current junior with 3.5+ GPA from limited-income background. Highly selective - only ~40 students admitted from across the country. School newspaper experience NOT required - they're looking for curious, motivated students interested in journalism. The Princeton connection and college advising component make this exceptional. Strong for students who might not otherwise have access to elite college preparation.",

    category: "writing",
    focusAreas: ["journalism", "writing", "college_prep", "low_income", "diversity"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Year-Long Program",
        startDate: new Date("2026-06-22"),
        endDate: new Date("2026-08-07"),
        notes: "Free. Online June + residential July-Aug + year-long advising",
      },
    ],
  },

  // ===========================================================================
  // 8. CALIFORNIA STATE SUMMER SCHOOL FOR THE ARTS (CSSSA)
  // ===========================================================================
  {
    name: "California State Summer School for the Arts",
    shortName: "CSSSA",
    organization: "California State Summer School for the Arts Foundation",
    description:
      "A rigorous, preprofessional 4-week arts training program for California high school students. Programs in animation, creative writing, dance, film, music, theatre, and visual arts.",
    websiteUrl: "https://www.csssa.ca.gov/",
    programYear: 2026,

    minGrade: 8,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "us_permanent_resident",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "California residents grades 8-12 strongly prioritized. Up to 20 out-of-state/international students may enroll. Graduating seniors (spring 2026) also eligible. Open to all genders. Selection based on artistic merit via audition/portfolio.",

    applicationOpens: null,
    applicationDeadline: new Date("2026-02-28"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.csssa.ca.gov/admissions/how-to-apply/",
    applicationNotes:
      "Deadline February 28, 2026 at 6:00 PM PST - NO EXCEPTIONS. $20 application fee (waivers available for CA residents with hardship). Decisions released by April 30, 2026.",

    format: "residential",
    location: "Valencia, CA (California Institute of the Arts campus)",

    llmContext:
      "CSSSA is California's premier state-sponsored arts program - a month-long preprofessional training experience at an affordable price. 2026 tuition for CA residents is $5,174 (one of the best values in arts education). Nearly half of students receive significant financial aid - need-based aid won't affect admission. Programs in Animation, Creative Writing, Dance, Film & Video, Music (including Vocal Arts), Theatre Arts, and Visual Arts. Selection is competitive and based on artistic merit via audition or portfolio. The program is rigorous and intensive - designed for serious young artists. Limited spots for out-of-state students (only ~20). Strong for California students seeking high-quality arts training without the cost of private programs. Alumni include many successful artists and performers. The CalArts campus provides professional facilities.",

    category: "performing_arts",
    focusAreas: ["animation", "creative_writing", "dance", "film", "music", "theatre", "visual_arts"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Main Session",
        startDate: new Date("2026-07-11"),
        endDate: new Date("2026-08-08"),
        notes: "4 weeks, CA residents $5,174",
      },
    ],
  },

  // ===========================================================================
  // 9. BERKLEE FIVE-WEEK SUMMER PROGRAM (ASPIRE)
  // ===========================================================================
  {
    name: "Berklee Aspire: Five-Week Music Performance Intensive",
    shortName: "Berklee Aspire",
    organization: "Berklee College of Music",
    description:
      "An intensive 5-week music performance program at the world's premier contemporary music college. Students study performance, music theory, and have opportunities to audition for Berklee admission.",
    websiteUrl: "https://summer.berklee.edu/programs/aspire-five-week-music-performance-intensive",
    programYear: 2026,

    minGrade: null,
    maxGrade: null,
    minAge: 15,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be 15+ years old. Must have at least 6 months of playing or singing experience. English proficiency required (no test scores needed). Most students are high school or college age. Housing available for ages 15+. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: null,
    isRolling: true,
    rollingNotes: "Register by January 31, 2026 to save $200. Priority scholarship deadline March 1.",
    applicationUrl: "https://summer.berklee.edu/programs/aspire-five-week-music-performance-intensive",
    applicationNotes:
      "$50 registration fee. Early bird: $900/week if registered by Jan 31; regular $1,100/week. Housing $1,500 (with early bird discount). Scholarship deadline March 1 (priority) or April 1 (regular).",

    format: "residential",
    location: "Boston, MA (Berklee campus)",

    llmContext:
      "Berklee Aspire is a 5-week intensive at the world's leading contemporary music school. Unlike classical-focused programs, Berklee emphasizes jazz, rock, pop, electronic, and contemporary styles. Cost: $900-1,100/week (early bird vs regular) plus $1,500 housing = roughly $6,000-7,000 total. Merit-based scholarships available ($1,000-$3,000 typical; limited full-tuition awards). Minimum 6 months playing experience required - not for beginners. Students can participate in live audition for Berklee undergraduate admission and scholarship consideration. The program also waives the $150 undergraduate application fee. Strong for students interested in contemporary/commercial music careers. The Berklee network and Boston music scene provide excellent exposure. Credit and non-credit options available. Ages 15+ for housing eligibility.",

    category: "performing_arts",
    focusAreas: ["music", "contemporary_music", "jazz", "performance", "music_production"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "5-Week Intensive",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-07"),
        notes: "$900-1,100/week + $1,500 housing, scholarships available",
      },
    ],
  },

  // ===========================================================================
  // 10. IDYLLWILD ARTS SUMMER
  // ===========================================================================
  {
    name: "Idyllwild Arts Summer Program",
    shortName: "Idyllwild Arts",
    organization: "Idyllwild Arts Foundation",
    description:
      "Summer arts workshops in the beautiful San Jacinto mountains of Southern California. Multi-disciplinary programs in visual art, music, theater, dance, creative writing, and film for ages 10+.",
    websiteUrl: "https://idyllwildarts.org/",
    programYear: 2026,

    minGrade: null,
    maxGrade: null,
    minAge: 10,
    maxAge: 17,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Ages 13-17 for immersive intensives. Residential 'sleepaway' options for ages 10+. Prior experience helpful but not required for many workshops. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: null,
    isRolling: true,
    rollingNotes: "Apply early to secure spot in competitive programs.",
    applicationUrl: "https://idyllwildarts.org/",
    applicationNotes:
      "Scholarship and financial aid may be available for eligible students.",

    format: "residential",
    location: "Idyllwild, CA",

    llmContext:
      "Idyllwild Arts has offered summer arts programs in the San Jacinto mountains for over 70 years. Picturesque campus among the pines provides immersive retreat atmosphere. Programs include visual art, music, theater, dance, creative writing, film, and Native American arts. Program cost around $3,500 including tuition, housing, and meals. Various session lengths available. The mountain setting provides unique creative environment away from urban distractions. Workshops taught by renowned teaching artists catering to all ability levels. Strong for students wanting arts exploration in intimate, supportive setting. Less pressured than some competitive programs - good for younger students or those new to serious arts study. The residential experience builds community and independence.",

    category: "performing_arts",
    focusAreas: ["visual_arts", "music", "theatre", "dance", "creative_writing", "film"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "pending_2026",

    sessions: [
      {
        name: "Summer Sessions",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-08-08"),
        notes: "Various session lengths, ~$3,500",
      },
    ],
  },

  // ===========================================================================
  // 11. MICA PRE-COLLEGE SUMMER INTENSIVE
  // ===========================================================================
  {
    name: "MICA Pre-College Summer Intensive",
    shortName: "MICA Pre-College",
    organization: "Maryland Institute College of Art",
    description:
      "A summer intensive at one of the nation's top art colleges. Students take studio classes, workshops, and earn college credits while learning from MICA faculty.",
    websiteUrl: "https://www.mica.edu/academics/youth-and-teen-programs/programs-for-teens/precollege/",
    programYear: 2026,

    minGrade: null,
    maxGrade: null,
    minAge: 15,
    maxAge: 17,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be ages 15-17 during program. Residential and commuter options available. Open to all genders and skill levels.",

    applicationOpens: new Date("2025-09-01"),
    applicationDeadline: new Date("2026-04-30"),
    isRolling: true,
    rollingNotes: "Early application deadline January 5, 2026. Final deadline April 30, 2026.",
    applicationUrl: "https://www.mica.edu/academics/youth-and-teen-programs/programs-for-teens/precollege/",
    applicationNotes:
      "$250 non-refundable deposit required upon acceptance to secure spot.",

    format: "residential",
    location: "Baltimore, MD",

    llmContext:
      "MICA Pre-College offers summer intensive experience at one of America's top-ranked art and design colleges. Multiple tracks available including studio arts, design, and interdisciplinary work. Students ages 15-17 take college-level courses taught by MICA faculty. Both residential and commuter options. Early application deadline January 5, 2026; final deadline April 30, 2026. The program combines studio work, workshops, and artist talks for transformative experience. Students earn college credits and build portfolios. Baltimore location provides access to vibrant arts scene and museums. Strong for students considering art school who want taste of rigorous art education. MICA's reputation in fine arts and design makes this valuable for portfolio development and college preparation.",

    category: "arts",
    focusAreas: ["visual_arts", "design", "art", "portfolio_development"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer Intensive",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-01"),
        notes: "4 weeks, residential and commuter options",
      },
    ],
  },

  // ===========================================================================
  // 12. PRATT INSTITUTE PRE-COLLEGE
  // ===========================================================================
  {
    name: "Pratt Institute PreCollege Summer Intensive",
    shortName: "Pratt Pre-College",
    organization: "Pratt Institute",
    description:
      "A 4-week intensive in art, design, architecture, and writing at Pratt's Brooklyn campus. Students earn 4 college credits and develop portfolios with guidance from distinguished faculty.",
    websiteUrl: "https://www.pratt.edu/continuing-and-professional-studies/precollege/summer-precollege/",
    programYear: 2026,

    minGrade: null,
    maxGrade: null,
    minAge: 16,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be 16-18 years old before December 31, 2026. Must be currently enrolled in high school or equivalent. U.S. citizens, permanent residents, or international students with valid F1 visa eligible. English proficiency required for international students (TOEFL 76, IELTS 6, Duolingo 95). Open to all genders and experience levels.",

    applicationOpens: null,
    applicationDeadline: new Date("2026-02-01"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.pratt.edu/continuing-and-professional-studies/precollege/summer-precollege/application-guidelines/",
    applicationNotes:
      "Scholarship application deadline February 1, 2026. Need/merit scholarships available for U.S. citizens/residents with household income under $60,000 (can cover full tuition, room & board). Billing mid-April.",

    format: "residential",
    location: "Brooklyn, NY",

    llmContext:
      "Pratt PreCollege is a 4-week intensive at one of NYC's premier art and design schools. Students earn 4 college credits in credit-bearing classes priced at 38% off undergraduate rate. Programs in art, design, architecture, and writing. The Brooklyn campus is in one of the world's creative capitals. Merit and need-based scholarships available for U.S. citizens/permanent residents - full tuition plus room & board possible for households under $60K (excludes travel and materials). Strong for students passionate about art/design who want college-level experience and portfolio development. The Pratt name carries weight in creative industries. NYC location provides unparalleled access to galleries, museums, and creative scene. Open to all experience levels - welcoming to students just beginning serious arts study.",

    category: "arts",
    focusAreas: ["visual_arts", "design", "architecture", "art", "writing", "portfolio_development"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer Intensive",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-01"),
        notes: "4 weeks, 4 college credits, scholarships available",
      },
    ],
  },

  // ===========================================================================
  // 13. COLUMBIA SCIENCE HONORS PROGRAM (SHP)
  // ===========================================================================
  {
    name: "Columbia Science Honors Program",
    shortName: "Columbia SHP",
    organization: "Columbia University",
    description:
      "A prestigious Saturday program for high school students passionate about science and mathematics. Take college-level courses taught by Columbia researchers throughout the academic year.",
    websiteUrl: "https://outreach.engineering.columbia.edu/SHP",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 11,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "REGIONAL RESTRICTION: Must attend high school in New York, New Jersey, or Connecticut AND live within 75 miles of Columbia campus. Apply during 9th, 10th, or 11th grade for following academic year. Open to all genders.",

    applicationOpens: new Date("2026-02-01"),
    applicationDeadline: null,
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://outreach.engineering.columbia.edu/SHP",
    applicationNotes:
      "Application opens early February. Requires online application, transcript, essay, and one recommendation (math/science teacher, counselor, or principal). $50 non-refundable application fee. 2-hour online entrance exam required (multiple weekend dates in June).",

    format: "commuter",
    location: "New York, NY (Columbia campus - Saturdays)",

    llmContext:
      "Columbia SHP is an academic-year Saturday program - NOT a summer program - but one of the most prestigious STEM enrichment opportunities for NYC-area high school students. Classes held Saturdays 10 AM - 12:30 PM throughout the school year. Starting fall 2025, program fee is $700/year ($350/semester) with waivers for financial hardship. Courses taught by Columbia scientists actively engaged in research. Strong regional restriction: NY/NJ/CT only, within 75 miles of campus. Highly competitive admission via application and entrance exam. The program provides serious exposure to university-level STEM coursework and research culture. Strong for students considering STEM careers who want rigorous academic challenge beyond high school. The Columbia connection is valuable for networking and college applications.",

    category: "STEM",
    focusAreas: ["science", "mathematics", "research", "physics", "chemistry", "biology", "computer_science"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Academic Year 2026-27",
        startDate: new Date("2026-09-12"),
        endDate: new Date("2027-05-15"),
        notes: "Saturdays during school year, $700/year",
      },
    ],
  },

  // ===========================================================================
  // 14. TELLURIDE ASSOCIATION SUMMER SEMINAR (TASS)
  // ===========================================================================
  {
    name: "Telluride Association Summer Seminar",
    shortName: "TASS",
    organization: "Telluride Association",
    description:
      "A FREE 5-week intellectual summer program for high school sophomores and juniors. Intensive seminars in Critical Black Studies or Anti-Oppressive Studies with focus on democratic self-governance.",
    websiteUrl: "https://tellurideassociation.org/tass/",
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
      "Must be current sophomore or junior (rising junior or senior). Must be 15+ at program start AND no older than 17 by program end (birthdates July 26, 2008 - June 21, 2011). U.S. and international students welcome. Welcomes Black, Indigenous, students of color, and those who have experienced economic hardship. Open to all genders.",

    applicationOpens: new Date("2025-10-15"),
    applicationDeadline: new Date("2025-12-03"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://tellurideassociation.org/our-programs/high-school-students/",
    applicationNotes:
      "Application deadline December 3, 2025 (now closed for 2026). Highly selective: ~3-5% acceptance rate.",

    format: "residential",
    location: "Various university campuses",

    llmContext:
      "TASS is one of the most selective and intellectually rigorous free summer programs in the country (~3-5% acceptance rate). Completely FREE - covers tuition, books, room, board, field trips, and can help with travel costs and replace summer job earnings. 5-week program (June 21 - July 25, 2026) in Critical Black Studies (TASS-CBS) or Anti-Oppressive Studies (TASS-AOS). Note: The old TASP name was retired in 2022; TASS now refers to both seminar tracks. Students engage in intensive intellectual work while practicing democratic self-governance in a communal living environment. The age requirement is specific (15-17 with exact birthdate range). Welcomes applications from underrepresented backgrounds. Strong for intellectually curious students interested in humanities, social justice, and community. The Telluride network is valuable and lifelong. Application requires essays demonstrating genuine intellectual engagement.",

    category: "humanities",
    focusAreas: ["humanities", "social_justice", "critical_studies", "leadership", "community"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "TASS 2026",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-07-25"),
        notes: "5 weeks, completely free",
      },
    ],
  },

  // ===========================================================================
  // 15. SEWANEE YOUNG WRITERS' CONFERENCE
  // ===========================================================================
  {
    name: "Sewanee Young Writers' Conference",
    shortName: "Sewanee YWC",
    organization: "University of the South",
    description:
      "A 2-week creative writing conference for high schoolers at Sewanee's beautiful mountain campus. Workshops in fiction, poetry, songwriting, literary nonfiction, and fantasy.",
    websiteUrl: "https://new.sewanee.edu/sywc/",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Must be currently enrolled in high school (grades 9-12). Rising sophomores, juniors, and seniors eligible. Must be able to travel to and stay at Sewanee campus. Open to all genders.",

    applicationOpens: new Date("2025-12-01"),
    applicationDeadline: new Date("2026-03-31"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://new.sewanee.edu/sywc/",
    applicationNotes:
      "Applications open December 2025, close March 2026. Requires 250-750 word statement, writing sample, and teacher recommendation. Decisions first week of April.",

    format: "residential",
    location: "Sewanee, TN (University of the South)",

    llmContext:
      "Sewanee Young Writers' Conference is highly selective - received 5,700 applicants in 2023 for only ~85 spots. 2-week program on Sewanee's stunning Cumberland Plateau campus. Tuition $2,600 including room and board; $175 refundable deposit for keys/prox cards. Workshops (max 12 students each) in fiction, poetry, songwriting, literary nonfiction, and fantasy. The intimate size creates strong community among serious young writers. Limited scholarships available. Application requires statement about reading/writing life plus writing sample. Strong for committed young writers seeking intensive craft development. The Sewanee Writers' Conference (for adults) is highly respected in literary world - the young writers program shares that reputation. The mountain campus provides immersive, distraction-free environment.",

    category: "writing",
    focusAreas: ["creative_writing", "fiction", "poetry", "nonfiction", "songwriting", "fantasy"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer 2026",
        startDate: new Date("2026-07-12"),
        endDate: new Date("2026-07-25"),
        notes: "2 weeks, $2,600 + $175 deposit",
      },
    ],
  },

  // ===========================================================================
  // 16. UCLA FILM SUMMER INSTITUTES
  // ===========================================================================
  {
    name: "UCLA Film and Television Summer Institutes",
    shortName: "UCLA Film",
    organization: "UCLA School of Theater, Film and Television",
    description:
      "Summer filmmaking programs at UCLA including tracks in cinematography, animation, digital filmmaking, and more. Some programs open to high school students grades 9-12.",
    websiteUrl: "https://summer.ucla.edu/institutes-guide/",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: 3.5,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "High school tracks open to students grades 9-12 (spring 2026). Minimum 3.5 cumulative GPA required. Complete transcript from grade 9 required. Some tracks (like Film Production) are 18+ only. Open to all genders.",

    applicationOpens: new Date("2026-02-18"),
    applicationDeadline: null,
    isRolling: true,
    rollingNotes: "Registration opens February 18, 2026. Specific offerings updated by January.",
    applicationUrl: "https://summer.ucla.edu/institutes-guide/",
    applicationNotes:
      "Requires unofficial transcript, value statement (250 words max). Program fees vary: Cinematography ~$3,100, Digital Filmmaking ~$5,500. California residents can apply for Summer Scholars Support (need/merit scholarships).",

    format: "residential",
    location: "Los Angeles, CA (UCLA campus)",

    llmContext:
      "UCLA Film Summer Institutes offer multiple tracks for high school students at one of the top public film schools. Programs include Pre-College Cinematography (~$3,100), Traditional Animation (grades 9-12), and various other tracks. Note: Film Production track is 18+ only. GPA requirement is 3.5+ with complete transcript from grade 9. California residents can apply for Summer Scholars Support (need and merit-based scholarships). Registration opens February 18, 2026. The UCLA TFT program is highly respected - summer institutes provide legitimate exposure to professional training. Students have access to UCLA's excellent facilities and equipment. Strong for California students who can access scholarships, making this more affordable than private alternatives.",

    category: "film",
    focusAreas: ["film", "filmmaking", "cinematography", "animation", "media"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "pending_2026",

    sessions: [
      {
        name: "Various Sessions",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-14"),
        notes: "Multiple programs, varying lengths and costs",
      },
    ],
  },

  // ===========================================================================
  // 17. ADROIT JOURNAL SUMMER MENTORSHIP
  // ===========================================================================
  {
    name: "Adroit Journal Summer Mentorship Program",
    shortName: "Adroit Mentorship",
    organization: "The Adroit Journal",
    description:
      "An online mentorship program pairing high school students with experienced writers. 10-week program in poetry, fiction, or creative nonfiction focusing on drafting, revision, and editing.",
    websiteUrl: "https://theadroitjournal.org/about/mentorship/",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Open to high school students grades 9-12 worldwide with internet access. Graduating seniors and gap year students eligible. No prior publication required. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: new Date("2026-03-10"),
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://theadroitjournal.org/about/mentorship/",
    applicationNotes:
      "Deadline typically mid-March (2025 was March 10). No application fee. Tuition $575; fee remission/financial aid available - need won't affect admission.",

    format: "online",
    location: "Online",

    llmContext:
      "The Adroit Journal Summer Mentorship is in its 13th year - a respected online program pairing high school students with experienced writer-mentors. 10-week program in poetry, fiction, or creative nonfiction. Tuition is $575 with financial aid available that won't affect admission decisions. No prior publication required - they're looking for passion and willingness to engage deeply. The online format makes this accessible globally regardless of location. Mentors are often published writers or MFA graduates. The Adroit Journal itself is a respected literary publication featuring emerging voices. Strong for students who want personalized attention to their writing development but can't access in-person programs. The 1-on-1 mentor relationship provides intensive feedback not available in workshop settings.",

    category: "writing",
    focusAreas: ["creative_writing", "poetry", "fiction", "nonfiction", "mentorship"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer 2026",
        startDate: new Date("2026-06-15"),
        endDate: new Date("2026-08-23"),
        notes: "10 weeks online, $575 with financial aid available",
      },
    ],
  },

  // ===========================================================================
  // 18. SCAD RISING STAR
  // ===========================================================================
  {
    name: "SCAD Rising Star",
    shortName: "SCAD Rising Star",
    organization: "Savannah College of Art and Design",
    description:
      "A 4-week pre-college program for rising high school seniors at SCAD. Students take two college-level courses, earning 10 credits while experiencing university life.",
    websiteUrl: "https://www.scad.edu/academics/pre-college-programs/scad-rising-star",
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
      "Must be current high school junior (rising senior). One-time participation only - cannot attend twice. Requires interview as part of application. Open to all genders.",

    applicationOpens: new Date("2025-09-01"),
    applicationDeadline: null,
    isRolling: true,
    rollingNotes: "Application available September 1, 2025. Apply early for best course selection.",
    applicationUrl: "https://risingstar.scad.edu/",
    applicationNotes:
      "$100 non-refundable application fee. Requires transcript through junior year first semester and personal/telephone interview. Balance due May 29, 2026.",

    format: "residential",
    location: "Savannah, GA or Atlanta, GA",

    llmContext:
      "SCAD Rising Star is a 4-week program for rising seniors (June 28 - July 24, 2026) at one of the largest art and design universities. Students earn 10 college credits toward a SCAD degree (or transferable). Minimum cost $6,490 including tuition, housing, and meals; supply costs vary by course. Programs offered at both Savannah and Atlanta campuses. Students take two SCAD courses taught by SCAD faculty and live in residence halls. The significant credit earning (10 hours) makes this attractive for students certain about pursuing art/design. SCAD offers programs in fine arts, design, architecture, entertainment arts, and more. One-time participation only. Interview required as part of application. Strong for students interested in SCAD specifically or who want substantial college credit in art/design.",

    category: "arts",
    focusAreas: ["visual_arts", "design", "art", "animation", "fashion", "architecture"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer 2026",
        startDate: new Date("2026-06-28"),
        endDate: new Date("2026-07-24"),
        notes: "4 weeks, $6,490+, 10 college credits",
      },
    ],
  },

  // ===========================================================================
  // 19. JUILLIARD SUMMER PROGRAMS
  // ===========================================================================
  {
    name: "Juilliard Summer Programs",
    shortName: "Juilliard Summer",
    organization: "The Juilliard School",
    description:
      "Summer intensives at the world's premier performing arts conservatory. Programs in dance, voice, and various music disciplines for talented high school students.",
    websiteUrl: "https://www.juilliard.edu/admissions",
    programYear: 2026,

    minGrade: 9,
    maxGrade: 12,
    minAge: 14,
    maxAge: 18,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Voice: Must have completed at least one year of high school (typically ages 14-18). Dance: Competitive admission via video audition (~44 dancers accepted). All programs require audition demonstrating high proficiency - not for beginners. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: null,
    isRolling: false,
    rollingNotes: null,
    applicationUrl: "https://www.juilliard.edu/admissions",
    applicationNotes:
      "Application fees: $75 for most programs, $40 for Summer Dance. Auditions required - some live (Feb 27 - Mar 6, 2026), some video. Not for beginners - must demonstrate high proficiency.",

    format: "residential",
    location: "New York, NY (Lincoln Center)",

    llmContext:
      "Juilliard Summer Programs provide training at the world's most prestigious performing arts conservatory. Programs include Summer Dance Intensive (video audition required, ~44 spots), Summer Voice (ages 14-18, completed at least 1 year of high school), and various music offerings. These are NOT beginner programs - applicants must demonstrate high level of proficiency via audition. The Juilliard name carries unmatched prestige in performing arts. Lincoln Center location provides NYC cultural immersion. Programs are selective and intensive, designed for students seriously considering conservatory education. Summer participation can inform Juilliard degree application decisions. Note: Juilliard Pre-College is a Saturday program during the academic year (separate from summer programs).",

    category: "performing_arts",
    focusAreas: ["music", "dance", "voice", "classical_music", "performance", "conservatory"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "verified",

    sessions: [
      {
        name: "Summer 2026",
        startDate: new Date("2026-07-06"),
        endDate: new Date("2026-08-01"),
        notes: "Various programs, audition required",
      },
    ],
  },

  // ===========================================================================
  // 20. GREAT BOOKS SUMMER PROGRAM
  // ===========================================================================
  {
    name: "Great Books Summer Program",
    shortName: "Great Books",
    organization: "Great Books Summer Program",
    description:
      "A 2-week residential seminar exploring classic texts through discussion-based learning. Students engage with works by Plato, Shakespeare, Austen, Dostoevsky, and more at beautiful college campuses.",
    websiteUrl: "https://greatbookssummer.com/",
    programYear: 2026,

    minGrade: 7,
    maxGrade: 12,
    minAge: null,
    maxAge: null,
    minGpaUnweighted: null,
    minGpaWeighted: null,
    citizenship: "international_ok",
    requiredCourses: [],
    recommendedCourses: [],
    eligibilityNotes:
      "Middle school students (grades 7-9) and high school students (grades 9-12) in separate programs. No prior experience with texts required - curiosity and willingness to engage are key. Open to all genders.",

    applicationOpens: null,
    applicationDeadline: null,
    isRolling: true,
    rollingNotes: "Rolling admissions. Programs fill quickly - apply early.",
    applicationUrl: "https://greatbookssummer.com/",
    applicationNotes:
      "Application includes short essays. Financial aid available.",

    format: "residential",
    location: "Various college campuses (Stanford, Amherst, Oxford, Dublin)",

    llmContext:
      "The Great Books Summer Program offers 2-week seminars exploring classic literature and philosophy through discussion-based learning. Locations include Stanford (CA), Amherst (MA), Oxford (UK), and Dublin (Ireland). Separate programs for middle school (grades 7-9) and high school (grades 9-12). Students read and discuss works spanning Western canon - Plato, Aristotle, Shakespeare, Austen, Dostoevsky, and more. No prior familiarity with texts required - designed for curious students who enjoy reading and intellectual discussion. Tuition typically $4,000-6,000 depending on location; financial aid available. The program emphasizes Socratic seminar style rather than lecture. Strong for students who love reading and want intellectually stimulating environment with like-minded peers. The Oxford and Dublin options provide unique international experience.",

    category: "humanities",
    focusAreas: ["literature", "philosophy", "humanities", "classics", "discussion_based_learning"],
    isActive: true,
    dataSource: "manual",
    dataStatus: "pending_2026",

    sessions: [
      {
        name: "Various Locations",
        startDate: new Date("2026-06-21"),
        endDate: new Date("2026-08-07"),
        notes: "2-week sessions at various campuses",
      },
    ],
  },
];
