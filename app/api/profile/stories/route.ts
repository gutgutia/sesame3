import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

// GET /api/profile/stories - Get all story entries
export async function GET() {
  try {
    const profileId = await requireProfile();

    // Get or create AboutMe
    let aboutMe = await prisma.aboutMe.findUnique({
      where: { studentProfileId: profileId },
      include: {
        storyEntries: {
          orderBy: { capturedAt: "desc" },
        },
      },
    });

    if (!aboutMe) {
      aboutMe = await prisma.aboutMe.create({
        data: { studentProfileId: profileId },
        include: {
          storyEntries: {
            orderBy: { capturedAt: "desc" },
          },
        },
      });
    }

    return NextResponse.json(aboutMe);
  } catch (error) {
    console.error("Error fetching stories:", error);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

// POST /api/profile/stories - Create a new story entry
export async function POST(request: NextRequest) {
  try {
    const profileId = await requireProfile();
    const body = await request.json();

    const { title, summary, themes, rawContent, contentType, conversationId } = body;

    if (!title || !summary || !rawContent || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get or create AboutMe
    let aboutMe = await prisma.aboutMe.findUnique({
      where: { studentProfileId: profileId },
    });

    if (!aboutMe) {
      aboutMe = await prisma.aboutMe.create({
        data: { studentProfileId: profileId },
      });
    }

    // Create the story entry
    const storyEntry = await prisma.storyEntry.create({
      data: {
        aboutMeId: aboutMe.id,
        title,
        summary,
        themes: themes || [],
        rawContent,
        contentType,
        conversationId,
      },
    });

    return NextResponse.json(storyEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating story:", error);
    return NextResponse.json(
      { error: "Failed to create story" },
      { status: 500 }
    );
  }
}

