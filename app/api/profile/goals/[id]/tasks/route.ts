import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireProfile } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/profile/goals/[id]/tasks
 * Create a new task for a goal
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const profileId = await requireProfile();
    const { id: goalId } = await params;
    const body = await request.json();
    
    // Verify goal ownership
    const goal = await prisma.goal.findFirst({
      where: { id: goalId, studentProfileId: profileId },
    });
    
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }
    
    // If creating a subtask, verify the parent task exists and belongs to this goal
    if (body.parentTaskId) {
      const parentTask = await prisma.task.findFirst({
        where: { id: body.parentTaskId, goalId },
      });
      if (!parentTask) {
        return NextResponse.json({ error: "Parent task not found" }, { status: 404 });
      }
    }
    
    // Get the next display order
    const lastTask = await prisma.task.findFirst({
      where: { 
        goalId,
        parentTaskId: body.parentTaskId || null, // Same level tasks
      },
      orderBy: { displayOrder: "desc" },
      select: { displayOrder: true },
    });
    const nextOrder = (lastTask?.displayOrder ?? -1) + 1;
    
    const task = await prisma.task.create({
      data: {
        studentProfileId: profileId,
        goalId,
        parentTaskId: body.parentTaskId || null,
        title: body.title,
        description: body.description,
        status: body.status || "pending",
        completed: body.completed ?? false,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        priority: body.priority,
        displayOrder: body.displayOrder ?? nextOrder,
      },
      include: {
        subtasks: true,
      },
    });
    
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
