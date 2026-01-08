// Tool Execution Handlers
// These functions execute when the AI calls a tool

import { prisma } from "@/lib/db";

// =============================================================================
// PROFILE TOOL HANDLERS
// =============================================================================

export async function handleSaveGpa(
  profileId: string,
  params: {
    gpaUnweighted?: number;
    gpaWeighted?: number;
    gpaScale?: number;
  }
) {
  const academics = await prisma.academics.upsert({
    where: { studentProfileId: profileId },
    update: {
      schoolReportedGpaUnweighted: params.gpaUnweighted,
      schoolReportedGpaWeighted: params.gpaWeighted,
      gpaScale: params.gpaScale,
    },
    create: {
      studentProfileId: profileId,
      schoolReportedGpaUnweighted: params.gpaUnweighted,
      schoolReportedGpaWeighted: params.gpaWeighted,
      gpaScale: params.gpaScale,
    },
  });
  
  return {
    success: true,
    message: `Saved GPA: ${params.gpaUnweighted ? `${params.gpaUnweighted} unweighted` : ""}${params.gpaWeighted ? `, ${params.gpaWeighted} weighted` : ""}`,
    data: academics,
  };
}

export async function handleSaveTestScores(
  profileId: string,
  params: {
    satTotal?: number;
    satMath?: number;
    satReading?: number;
    actComposite?: number;
    actEnglish?: number;
    actMath?: number;
    actReading?: number;
    actScience?: number;
    psatTotal?: number;
  }
) {
  const testing = await prisma.testing.upsert({
    where: { studentProfileId: profileId },
    update: params,
    create: {
      studentProfileId: profileId,
      ...params,
    },
  });
  
  const scores: string[] = [];
  if (params.satTotal) scores.push(`SAT ${params.satTotal}`);
  if (params.actComposite) scores.push(`ACT ${params.actComposite}`);
  if (params.psatTotal) scores.push(`PSAT ${params.psatTotal}`);
  
  return {
    success: true,
    message: `Saved test scores: ${scores.join(", ")}`,
    data: testing,
  };
}

export async function handleAddActivity(
  profileId: string,
  params: {
    title: string;
    organization: string;
    category?: string;
    isLeadership?: boolean;
    description?: string;
    hoursPerWeek?: number;
    yearsActive?: string;
  }
) {
  // Check for existing activity with similar title (case-insensitive, fuzzy match)
  // This prevents duplicates when the secretary re-mentions the same activity
  const existingActivities = await prisma.activity.findMany({
    where: { studentProfileId: profileId },
    select: { id: true, title: true, organization: true },
  });

  // Normalize for comparison (lowercase, remove common words)
  const normalizeTitle = (t: string) =>
    t.toLowerCase()
      .replace(/\b(club|team|member|captain|president|treasurer|secretary|vp|vice president)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedNewTitle = normalizeTitle(params.title);

  // Find similar existing activity
  const similarActivity = existingActivities.find(existing => {
    const normalizedExisting = normalizeTitle(existing.title);
    // Check if one contains the other, or they share a significant word
    return normalizedExisting.includes(normalizedNewTitle) ||
           normalizedNewTitle.includes(normalizedExisting) ||
           (normalizedNewTitle.split(' ').some(word =>
             word.length > 3 && normalizedExisting.includes(word)
           ));
  });

  if (similarActivity) {
    // Update existing activity with any new details
    const updated = await prisma.activity.update({
      where: { id: similarActivity.id },
      data: {
        // Only update fields if they provide more info
        title: params.title.length > similarActivity.title.length ? params.title : undefined,
        organization: params.organization || undefined,
        category: params.category || undefined,
        isLeadership: params.isLeadership ?? undefined,
        description: params.description || undefined,
        hoursPerWeek: params.hoursPerWeek || undefined,
        yearsActive: params.yearsActive || undefined,
      },
    });

    console.log(`[Tool] Updated existing activity "${similarActivity.title}" -> "${params.title}"`);

    return {
      success: true,
      message: `Updated activity: ${params.title}`,
      data: updated,
      requiresConfirmation: false, // Already existed, no need to confirm
      widgetType: "activity",
    };
  }

  // No similar activity found - create new one
  const lastActivity = await prisma.activity.findFirst({
    where: { studentProfileId: profileId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });

  const activity = await prisma.activity.create({
    data: {
      studentProfileId: profileId,
      title: params.title,
      organization: params.organization,
      category: params.category,
      isLeadership: params.isLeadership ?? false,
      description: params.description,
      hoursPerWeek: params.hoursPerWeek,
      yearsActive: params.yearsActive,
      displayOrder: (lastActivity?.displayOrder ?? -1) + 1,
    },
  });

  return {
    success: true,
    message: `Added activity: ${params.title} at ${params.organization}`,
    data: activity,
    requiresConfirmation: true,
    widgetType: "activity",
  };
}

export async function handleAddAward(
  profileId: string,
  params: {
    title: string;
    level: string;
    organization?: string;
    year?: number;
    description?: string;
  }
) {
  const lastAward = await prisma.award.findFirst({
    where: { studentProfileId: profileId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  
  const award = await prisma.award.create({
    data: {
      studentProfileId: profileId,
      title: params.title,
      level: params.level,
      organization: params.organization,
      year: params.year,
      description: params.description,
      displayOrder: (lastAward?.displayOrder ?? -1) + 1,
    },
  });
  
  return {
    success: true,
    message: `Added award: ${params.title} (${params.level})`,
    data: award,
    requiresConfirmation: true,
    widgetType: "award",
  };
}

export async function handleAddCourse(
  profileId: string,
  params: {
    name: string;
    status: string;
    level?: string;
    subject?: string;
    grade?: string;
    gradeLevel?: string;
    academicYear?: string;
    planningNotes?: string;
  }
) {
  const course = await prisma.course.create({
    data: {
      studentProfileId: profileId,
      name: params.name,
      status: params.status,
      level: params.level,
      subject: params.subject,
      grade: params.grade,
      gradeLevel: params.gradeLevel,
      academicYear: params.academicYear,
      planningNotes: params.planningNotes,
    },
  });
  
  const statusLabel = params.status === "completed" ? "completed" : 
                      params.status === "in_progress" ? "currently taking" : "planning to take";
  
  return {
    success: true,
    message: `Added course: ${params.name} (${statusLabel})`,
    data: course,
    requiresConfirmation: true,
    widgetType: "course",
  };
}

export async function handleAddProgram(
  profileId: string,
  params: {
    name: string;
    organization?: string;
    type: string;
    status: string;
    year?: number;
    description?: string;
  }
) {
  const program = await prisma.program.create({
    data: {
      studentProfileId: profileId,
      name: params.name,
      organization: params.organization,
      type: params.type,
      status: params.status,
      year: params.year,
      description: params.description,
    },
  });
  
  return {
    success: true,
    message: `Added program: ${params.name}`,
    data: program,
    requiresConfirmation: true,
    widgetType: "program",
  };
}

export async function handleSaveProfileInfo(
  profileId: string,
  params: {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    grade?: string;
    graduationYear?: number;
    highSchoolName?: string;
    highSchoolCity?: string;
    highSchoolState?: string;
  }
) {
  const profile = await prisma.studentProfile.update({
    where: { id: profileId },
    data: params,
  });
  
  return {
    success: true,
    message: "Updated profile information",
    data: profile,
  };
}

// =============================================================================
// PLANNING TOOL HANDLERS
// =============================================================================

export async function handleAddGoal(
  profileId: string,
  params: {
    title: string;
    category: string;
    description?: string;
    targetDate?: string;
    priority?: string;
    impactDescription?: string;
  }
) {
  const lastGoal = await prisma.goal.findFirst({
    where: { studentProfileId: profileId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  
  const goal = await prisma.goal.create({
    data: {
      studentProfileId: profileId,
      title: params.title,
      category: params.category,
      description: params.description,
      targetDate: params.targetDate ? new Date(params.targetDate) : undefined,
      priority: params.priority,
      impactDescription: params.impactDescription,
      displayOrder: (lastGoal?.displayOrder ?? -1) + 1,
    },
  });
  
  return {
    success: true,
    message: `Created goal: ${params.title}`,
    data: goal,
    requiresConfirmation: true,
    widgetType: "goal",
  };
}

export async function handleAddSchoolToList(
  profileId: string,
  params: {
    schoolName: string;
    tier?: string;
    interestLevel?: string;
    applicationType?: string;
    whyInterested?: string;
  }
) {
  // Default tier to "target" if not specified
  const tier = params.tier || "target";

  // First, find or create the school in our reference data
  let school = await prisma.school.findFirst({
    where: { name: { contains: params.schoolName, mode: "insensitive" } },
  });

  if (!school) {
    // Create a basic school entry (can be enriched later)
    school = await prisma.school.create({
      data: {
        name: params.schoolName,
      },
    });
  }

  // Check if already on list
  const existing = await prisma.studentSchool.findUnique({
    where: {
      studentProfileId_schoolId: {
        studentProfileId: profileId,
        schoolId: school.id,
      },
    },
  });

  if (existing) {
    // Update existing entry
    const updated = await prisma.studentSchool.update({
      where: { id: existing.id },
      data: {
        tier: tier,
        interestLevel: params.interestLevel,
        applicationType: params.applicationType,
        whyInterested: params.whyInterested,
      },
      include: { school: true },
    });

    return {
      success: true,
      message: `Updated ${params.schoolName} on your list (${tier})`,
      data: updated,
    };
  }
  
  // Get next display order
  const lastSchool = await prisma.studentSchool.findFirst({
    where: { studentProfileId: profileId },
    orderBy: { displayOrder: "desc" },
    select: { displayOrder: true },
  });
  
  const studentSchool = await prisma.studentSchool.create({
    data: {
      studentProfileId: profileId,
      schoolId: school.id,
      tier: tier,
      interestLevel: params.interestLevel,
      applicationType: params.applicationType,
      whyInterested: params.whyInterested,
      displayOrder: (lastSchool?.displayOrder ?? -1) + 1,
    },
    include: { school: true },
  });

  return {
    success: true,
    message: `Added ${params.schoolName} to your list as a ${tier}`,
    data: studentSchool,
    requiresConfirmation: true,
    widgetType: "school",
  };
}

// =============================================================================
// SEARCH TOOL HANDLERS
// =============================================================================

export async function handleWebSearch(params: {
  query: string;
  type?: string;
}) {
  // TODO: Integrate with a search API (Tavily, Serper, or Google Custom Search)
  // For now, return a placeholder
  return {
    success: false,
    message: "Web search is not yet implemented. Please check college websites directly for now.",
    query: params.query,
  };
}

export async function handleLookupSchool(params: {
  schoolName: string;
  infoNeeded?: string[];
}) {
  // Look up school in our database
  const school = await prisma.school.findFirst({
    where: { name: { contains: params.schoolName, mode: "insensitive" } },
  });
  
  if (!school) {
    return {
      success: false,
      message: `I don't have detailed information about ${params.schoolName} in my database yet. Would you like me to add it to your list anyway?`,
    };
  }
  
  return {
    success: true,
    data: school,
    message: `Found information about ${school.name}`,
  };
}

// =============================================================================
// TOOL EXECUTOR
// =============================================================================

export type ToolResult = {
  success: boolean;
  message: string;
  data?: unknown;
  requiresConfirmation?: boolean;
  widgetType?: string;
};

export async function executeToolCall(
  profileId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "saveGpa":
      return handleSaveGpa(profileId, args as Parameters<typeof handleSaveGpa>[1]);
    case "saveTestScores":
      return handleSaveTestScores(profileId, args as Parameters<typeof handleSaveTestScores>[1]);
    case "addActivity":
      return handleAddActivity(profileId, args as Parameters<typeof handleAddActivity>[1]);
    case "addAward":
      return handleAddAward(profileId, args as Parameters<typeof handleAddAward>[1]);
    case "addCourse":
      return handleAddCourse(profileId, args as Parameters<typeof handleAddCourse>[1]);
    case "addProgram":
      return handleAddProgram(profileId, args as Parameters<typeof handleAddProgram>[1]);
    case "saveProfileInfo":
      return handleSaveProfileInfo(profileId, args as Parameters<typeof handleSaveProfileInfo>[1]);
    case "addGoal":
      return handleAddGoal(profileId, args as Parameters<typeof handleAddGoal>[1]);
    case "addSchoolToList":
      return handleAddSchoolToList(profileId, args as Parameters<typeof handleAddSchoolToList>[1]);
    case "webSearch":
      return handleWebSearch(args as Parameters<typeof handleWebSearch>[0]);
    case "lookupSchool":
      return handleLookupSchool(args as Parameters<typeof handleLookupSchool>[0]);
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
  }
}
