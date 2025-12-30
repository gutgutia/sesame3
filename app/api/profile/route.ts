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
        programs: {
          orderBy: { year: "desc" },
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
            school: true,
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

    return NextResponse.json(profile, {
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
 */
export async function PUT(request: NextRequest) {
  try {
    const profileId = await getCurrentProfileId();
    
    if (!profileId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    // Only allow updating specific fields
    const allowedFields = [
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

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // Handle birthDate specially - convert string to Date
        if (field === "birthDate" && body[field]) {
          updateData[field] = new Date(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }
    
    const profile = await prisma.studentProfile.update({
      where: { id: profileId },
      data: updateData,
    });
    
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
