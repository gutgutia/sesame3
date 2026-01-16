import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser, getCurrentProfileId } from "@/lib/auth";
import { invalidateProfileCache } from "@/lib/cache/profile-cache";
import { invalidateContextCache } from "@/lib/cache/context-cache";

/**
 * GET /api/profile
 * Get the current user's complete student profile
 */
export async function GET() {
  try {
    const profileId = await getCurrentProfileId();
    
    if (!profileId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: {
        aboutMe: true,
        academics: true,
        testing: {
          include: {
            satScores: { orderBy: { testDate: "desc" } },
            actScores: { orderBy: { testDate: "desc" } },
            apScores: { orderBy: { year: "desc" } },
            subjectTests: { orderBy: { testDate: "desc" } },
          },
        },
        courses: {
          orderBy: [
            { status: "asc" },
            { academicYear: "desc" },
            { name: "asc" },
          ],
        },
        activities: {
          orderBy: { displayOrder: "asc" },
        },
        awards: {
          orderBy: { displayOrder: "asc" },
        },
        summerProgramList: {
          include: {
            summerProgram: {
              select: {
                id: true,
                name: true,
                organization: true,
                category: true,
                focusAreas: true,
              },
            },
          },
          orderBy: [
            { applicationYear: "desc" },
            { displayOrder: "asc" },
          ],
        },
        goals: {
          include: {
            tasks: {
              where: { parentTaskId: null }, // Only top-level tasks
              orderBy: { displayOrder: "asc" },
              include: {
                subtasks: {
                  orderBy: { displayOrder: "asc" },
                },
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
        schoolList: {
          include: {
            school: {
              select: {
                id: true,
                name: true,
                city: true,
                state: true,
                type: true,
                acceptanceRate: true,
                satRange25: true,
                satRange75: true,
                actRange25: true,
                actRange75: true,
                websiteUrl: true,
              },
            },
          },
          orderBy: { displayOrder: "asc" },
        },
      },
    });
    
    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Transform summerProgramList to programs for backward compatibility
    // Transform academics to use frontend field names
    const transformedProfile = {
      ...profile,
      academics: profile.academics ? {
        ...profile.academics,
        gpaUnweighted: profile.academics.schoolReportedGpaUnweighted,
        gpaWeighted: profile.academics.schoolReportedGpaWeighted,
      } : null,
      programs: profile.summerProgramList.map((p) => ({
        id: p.id,
        name: p.isCustom ? p.customName : p.summerProgram?.name,
        organization: p.isCustom ? p.customOrganization : p.summerProgram?.organization,
        description: p.isCustom ? p.customDescription : null,
        status: p.status,
        year: p.applicationYear,
        notes: p.notes,
        whyInterested: p.whyInterested,
        outcome: p.outcome,
        isCustom: p.isCustom,
        summerProgramId: p.summerProgramId,
        summerProgram: p.summerProgram,
        displayOrder: p.displayOrder,
      })),
      // Keep summerProgramList for recommendations engine
      summerProgramList: profile.summerProgramList,
    };

    return NextResponse.json(transformedProfile, {
      headers: {
        // Cache for 30 seconds, allow stale for 5 minutes while revalidating
        "Cache-Control": "private, max-age=30, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/profile
 * Update basic profile fields (name, grade, school info)
 * Also supports updating User fields like accountType
 */
export async function PUT(request: NextRequest) {
  try {
    const profileId = await getCurrentProfileId();
    const user = await getCurrentUser();

    if (!profileId || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Fields that go to StudentProfile
    const profileFields = [
      "firstName",
      "lastName",
      "preferredName",
      "grade",
      "graduationYear",
      "highSchoolName",
      "highSchoolCity",
      "highSchoolState",
      "highSchoolType",
      "birthDate",
      "residencyStatus",
      "onboardingData",
      "onboardingCompletedAt",
    ];

    // Fields that go to User model
    const userFields = ["accountType"];

    const profileUpdateData: Record<string, unknown> = {};
    for (const field of profileFields) {
      if (body[field] !== undefined) {
        // Handle birthDate specially - convert string to Date
        if (field === "birthDate" && body[field]) {
          profileUpdateData[field] = new Date(body[field]);
        } else {
          profileUpdateData[field] = body[field];
        }
      }
    }

    const userUpdateData: Record<string, unknown> = {};
    for (const field of userFields) {
      if (body[field] !== undefined) {
        // Validate accountType
        if (field === "accountType") {
          const validTypes = ["student", "parent", "counselor"];
          if (validTypes.includes(body[field])) {
            userUpdateData[field] = body[field];
          }
        }
      }
    }

    // Update profile if there are profile fields to update
    let profile;
    if (Object.keys(profileUpdateData).length > 0) {
      profile = await prisma.studentProfile.update({
        where: { id: profileId },
        data: profileUpdateData,
      });
    } else {
      profile = await prisma.studentProfile.findUnique({
        where: { id: profileId },
      });
    }

    // Update user if there are user fields to update
    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: userUpdateData,
      });
    }

    // Invalidate caches (profile and context both depend on profile data)
    invalidateProfileCache(profileId);
    invalidateContextCache(profileId);

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
