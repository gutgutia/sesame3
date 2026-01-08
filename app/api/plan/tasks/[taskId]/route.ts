import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentProfileId } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * PUT /api/plan/tasks/[taskId]
 * Update a task's status (used by timeline view)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json();

    // Verify task belongs to this profile
    const existing = await prisma.task.findFirst({
      where: { id: taskId, studentProfileId: profileId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Handle status update (convert between status and completed)
    const updateData: Record<string, unknown> = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      // If status is "completed", set completed to true
      if (body.status === "completed" && !existing.completed) {
        updateData.completed = true;
        updateData.completedAt = new Date();
      } else if (body.status !== "completed" && existing.completed) {
        updateData.completed = false;
        updateData.completedAt = null;
      }
    }

    if (body.completed !== undefined) {
      updateData.completed = body.completed;
      updateData.completedAt = body.completed && !existing.completed
        ? new Date()
        : !body.completed && existing.completed
          ? null
          : undefined;
      // Also update status to match
      updateData.status = body.completed ? "completed" : "pending";
    }

    // Allow other fields to be updated
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const task = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[Plan Tasks] Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/plan/tasks/[taskId]
 * Delete a task
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const profileId = await getCurrentProfileId();

    if (!profileId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { taskId } = await params;

    // Verify task belongs to this profile
    const existing = await prisma.task.findFirst({
      where: { id: taskId, studentProfileId: profileId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id: taskId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Plan Tasks] Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
