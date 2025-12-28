"use client";

import React, { useState } from "react";
import {
  Plus,
  MessageCircle,
  Archive,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Check,
  Target,
  Calendar,
  LayoutList,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { AddGoalModal, AddTaskModal, TimelineView } from "@/components/plan";

// =============================================================================
// TYPES
// =============================================================================

interface Subtask {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  dueDate: string | null;
  priority: string | null;
}

interface Task {
  id: string;
  title: string;
  status: string;
  completed: boolean;
  dueDate: string | null;
  priority: string | null;
  subtasks: Subtask[];
}

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string | null;
  targetDate: string | null;
  tasks: Task[];
}

// =============================================================================
// MAIN PAGE
// =============================================================================

type ViewMode = "goals" | "timeline";

export default function PlanPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("goals");
  const [showCompleted, setShowCompleted] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [taskModalState, setTaskModalState] = useState<{
    isOpen: boolean;
    goalId: string;
    goalTitle: string;
    parentTaskId?: string;
    parentTaskTitle?: string;
  }>({ isOpen: false, goalId: "", goalTitle: "" });
  
  // Use global profile context with optimistic updates
  const { profile, isLoading, refreshProfile, toggleTask: optimisticToggleTask, addGoal: optimisticAddGoal, addTask: optimisticAddTask, addSubtask: optimisticAddSubtask } = useProfile();
  
  // Extract goals from profile
  const goals: Goal[] = (profile?.goals || []).map(g => ({
    id: g.id,
    title: g.title,
    description: g.description || null,
    category: g.category || "other",
    status: g.status || "planning",
    priority: g.priority || null,
    targetDate: g.targetDate || null,
    tasks: (g.tasks || []).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status || "pending",
      completed: t.completed || false,
      dueDate: t.dueDate || null,
      priority: t.priority || null,
      subtasks: (t.subtasks || []).map(st => ({
        id: st.id,
        title: st.title,
        status: st.status || "pending",
        completed: st.completed || false,
        dueDate: st.dueDate || null,
        priority: st.priority || null,
      })),
    })),
  }));

  // Group goals by status
  const activeGoals = goals.filter(g => g.status === "in_progress");
  const planningGoals = goals.filter(g => g.status === "planning");
  const parkingLotGoals = goals.filter(g => g.status === "parking_lot");
  const completedGoals = goals.filter(g => g.status === "completed");

  const openTaskModal = (goalId: string, goalTitle: string, parentTaskId?: string, parentTaskTitle?: string) => {
    setTaskModalState({
      isOpen: true,
      goalId,
      goalTitle,
      parentTaskId,
      parentTaskTitle,
    });
  };

  const closeTaskModal = () => {
    setTaskModalState({ isOpen: false, goalId: "", goalTitle: "" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-text-main mb-2">Your Plan</h1>
          <p className="text-text-muted">Goals, tasks, and your path forward.</p>
        </div>
        <div className="flex gap-3">
          {/* View Toggle */}
          <div className="flex bg-bg-sidebar rounded-xl p-1">
            <button
              onClick={() => setViewMode("goals")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                viewMode === "goals"
                  ? "bg-white text-text-main shadow-sm"
                  : "text-text-muted hover:text-text-main"
              )}
            >
              <LayoutList className="w-4 h-4" />
              Goals
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                viewMode === "timeline"
                  ? "bg-white text-text-main shadow-sm"
                  : "text-text-muted hover:text-text-main"
              )}
            >
              <Clock className="w-4 h-4" />
              Timeline
            </button>
          </div>
          <Link href="/advisor?mode=planning">
            <Button variant="secondary">
              <MessageCircle className="w-4 h-4" />
              Brainstorm
            </Button>
          </Link>
          {viewMode === "goals" && (
            <Button onClick={() => setIsAddGoalModalOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Goal
            </Button>
          )}
        </div>
      </div>

      {/* Timeline View - Full Width */}
      {viewMode === "timeline" && (
        <TimelineView />
      )}

      {/* Goals View - Main Layout: 2/3 content + 1/3 sidebar */}
      {viewMode === "goals" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2">
          {goals.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-accent-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-accent-primary" />
              </div>
              <h2 className="font-display font-bold text-xl mb-2">No goals yet</h2>
              <p className="text-text-muted mb-6 max-w-md mx-auto">
                Start by setting some goals — summer programs, competitions, or projects.
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setIsAddGoalModalOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Add Your First Goal
                </Button>
                <Link href="/advisor?mode=planning">
                  <Button variant="secondary">
                    <Sparkles className="w-4 h-4" />
                    Brainstorm Ideas
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Active Goals */}
              {activeGoals.length > 0 && (
                <GoalSection 
                  title="In Progress" 
                  goals={activeGoals} 
                  onToggleTask={optimisticToggleTask}
                  onAddTask={openTaskModal}
                />
              )}

              {/* Planning Goals */}
              {planningGoals.length > 0 && (
                <GoalSection 
                  title="Planning" 
                  goals={planningGoals} 
                  onToggleTask={optimisticToggleTask}
                  onAddTask={openTaskModal}
                />
              )}

              {/* Parking Lot */}
              {parkingLotGoals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Archive className="w-5 h-5 text-text-muted" />
                    <h2 className="font-display font-bold text-lg text-text-muted">Parking Lot</h2>
                    <span className="text-xs text-text-light">({parkingLotGoals.length})</span>
                  </div>
                  <div className="space-y-4">
                    {parkingLotGoals.map(goal => (
                      <GoalCard 
                        key={goal.id} 
                        goal={goal} 
                        minimal 
                        onToggleTask={optimisticToggleTask}
                        onAddTask={openTaskModal}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {completedGoals.length > 0 && (
                <div>
                  <button 
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-2 mb-4 text-text-muted hover:text-text-main transition-colors"
                  >
                    {showCompleted ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    <span className="font-display font-bold text-lg">Completed</span>
                    <span className="text-xs text-text-light">({completedGoals.length})</span>
                  </button>
                  
                  {showCompleted && (
                    <div className="space-y-4">
                      {completedGoals.map(goal => (
                        <GoalCard 
                          key={goal.id} 
                          goal={goal} 
                          completed 
                          onToggleTask={optimisticToggleTask}
                          onAddTask={openTaskModal}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar - 1/3 width, offset to align with cards not section titles */}
        <div className="lg:col-span-1 space-y-5 lg:pt-10">
          {/* Quick Stats */}
          {goals.length > 0 && (
            <div className="bg-white border border-border-subtle rounded-[20px] p-5 shadow-card">
              <h3 className="font-display font-bold text-text-main mb-4">Overview</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Goals</span>
                  <span className="font-bold text-text-main">{goals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">In Progress</span>
                  <span className="font-bold text-accent-primary">{activeGoals.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Planning</span>
                  <span className="font-bold text-amber-600">{planningGoals.length}</span>
                </div>
                {completedGoals.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Completed</span>
                    <span className="font-bold text-green-600">{completedGoals.length}</span>
                  </div>
                )}
                <div className="h-px bg-border-subtle my-2" />
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Tasks</span>
                  <span className="font-bold text-text-main">
                    {goals.reduce((acc, g) => acc + g.tasks.length + g.tasks.reduce((a, t) => a + t.subtasks.length, 0), 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Advisor CTA */}
          <Link 
            href="/advisor?mode=planning"
            className="block bg-accent-surface/50 border border-accent-border rounded-[20px] p-5 hover:bg-accent-surface transition-colors group"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-accent-primary" />
              </div>
              <div className="font-display font-bold text-text-main">Need ideas?</div>
            </div>
            <p className="text-sm text-text-muted mb-4">
              Brainstorm goals and strategies with your AI advisor.
            </p>
            <div className="flex items-center gap-2 text-sm font-medium text-accent-primary group-hover:gap-3 transition-all">
              <MessageCircle className="w-4 h-4" />
              Chat with Advisor
              <ChevronRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Upcoming Deadlines (placeholder for future) */}
          {goals.some(g => g.tasks.some(t => t.dueDate)) && (
            <div className="bg-white border border-border-subtle rounded-[20px] p-5 shadow-card">
              <h3 className="font-display font-bold text-text-main mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-text-muted" />
                Upcoming
              </h3>
              <div className="space-y-3">
                {goals
                  .flatMap(g => g.tasks.filter(t => t.dueDate && !t.completed).map(t => ({ ...t, goalTitle: g.title })))
                  .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                  .slice(0, 5)
                  .map(task => (
                    <div key={task.id} className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 rounded-full bg-accent-primary shrink-0" />
                      <span className="flex-1 truncate text-text-main">{task.title}</span>
                      <span className="text-xs text-text-muted shrink-0">
                        {new Date(task.dueDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modals */}
      <AddGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        onGoalAdded={(newGoal) => {
          setIsAddGoalModalOpen(false);
          // Optimistic add if we have goal data, otherwise background refresh
          if (newGoal) {
            optimisticAddGoal({
              id: newGoal.id,
              title: newGoal.title,
              description: newGoal.description,
              category: newGoal.category,
              status: newGoal.status,
              priority: newGoal.priority,
              targetDate: newGoal.targetDate,
              tasks: [],
            });
          } else {
            refreshProfile(); // Background refresh (no loading state)
          }
        }}
      />
      
      <AddTaskModal
        isOpen={taskModalState.isOpen}
        onClose={closeTaskModal}
        onTaskAdded={(newTask) => {
          closeTaskModal();
          // Optimistic add if we have task data, otherwise background refresh
          if (newTask && taskModalState.goalId) {
            if (taskModalState.parentTaskId) {
              optimisticAddSubtask(taskModalState.goalId, taskModalState.parentTaskId, {
                id: newTask.id,
                title: newTask.title,
                status: newTask.status || "pending",
                completed: newTask.completed || false,
                dueDate: newTask.dueDate || null,
                priority: newTask.priority || null,
              });
            } else {
              optimisticAddTask(taskModalState.goalId, {
                id: newTask.id,
                title: newTask.title,
                description: newTask.description,
                status: newTask.status || "pending",
                completed: newTask.completed || false,
                dueDate: newTask.dueDate || null,
                priority: newTask.priority || null,
                startDate: newTask.startDate || null,
                subtasks: [],
              });
            }
          } else {
            refreshProfile(); // Background refresh (no loading state)
          }
        }}
        goalId={taskModalState.goalId}
        goalTitle={taskModalState.goalTitle}
        parentTaskId={taskModalState.parentTaskId}
        parentTaskTitle={taskModalState.parentTaskTitle}
      />
    </>
  );
}

// =============================================================================
// COMPONENTS
// =============================================================================

function GoalSection({ 
  title, 
  goals, 
  onToggleTask,
  onAddTask,
}: { 
  title: string; 
  goals: Goal[]; 
  onToggleTask: (goalId: string, taskId: string, completed: boolean) => void;
  onAddTask: (goalId: string, goalTitle: string, parentTaskId?: string, parentTaskTitle?: string) => void;
}) {
  return (
    <div>
      <h2 className="font-display font-bold text-lg text-text-main mb-4">{title}</h2>
      <div className="space-y-4">
        {goals.map(goal => (
          <GoalCard 
            key={goal.id} 
            goal={goal} 
            onToggleTask={onToggleTask}
            onAddTask={onAddTask}
          />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ 
  goal, 
  minimal = false, 
  completed = false,
  onToggleTask,
  onAddTask,
}: { 
  goal: Goal; 
  minimal?: boolean; 
  completed?: boolean;
  onToggleTask: (goalId: string, taskId: string, completed: boolean) => void;
  onAddTask: (goalId: string, goalTitle: string, parentTaskId?: string, parentTaskTitle?: string) => void;
}) {
  const [expanded, setExpanded] = useState(!minimal && !completed);

  // Count all tasks including subtasks
  const countTasks = (tasks: Task[]): { completed: number; total: number } => {
    let comp = 0;
    let tot = 0;
    for (const task of tasks) {
      tot++;
      if (task.completed) comp++;
      for (const subtask of task.subtasks) {
        tot++;
        if (subtask.completed) comp++;
      }
    }
    return { completed: comp, total: tot };
  };

  const { completed: completedTasks, total: totalTasks } = countTasks(goal.tasks);
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const toggleTask = async (taskId: string, currentCompleted: boolean) => {
    // Optimistic update - update UI immediately
    const newCompleted = !currentCompleted;
    onToggleTask(goal.id, taskId, newCompleted);
    
    // Then sync with server in background (no await to avoid blocking UI)
    fetch(`/api/profile/goals/${goal.id}/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: newCompleted }),
    }).catch(err => {
      console.error("Failed to toggle task:", err);
      // Rollback on failure
      onToggleTask(goal.id, taskId, currentCompleted);
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "research": return "🔬";
      case "competition": return "🏆";
      case "leadership": return "👥";
      case "project": return "🚀";
      case "academic": return "📚";
      case "application": return "📝";
      default: return "🎯";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return null;
    }
  };

  return (
    <Card className={cn(
      "p-5 transition-all",
      completed && "opacity-60",
      minimal && "bg-bg-sidebar"
    )}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getCategoryIcon(goal.category)}</span>
          <div>
            <h3 className={cn(
              "font-display font-bold",
              completed && "line-through text-text-muted"
            )}>
              {goal.title}
            </h3>
            {goal.targetDate && (
              <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                <Calendar className="w-3 h-3" />
                {formatDate(goal.targetDate)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-text-muted hover:text-text-main"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>{completedTasks} of {totalTasks} tasks</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-bg-sidebar rounded-full h-2">
            <div 
              className="bg-accent-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Tasks */}
      {expanded && (
        <div className="pt-3 border-t border-border-subtle">
          {goal.tasks.length > 0 ? (
            <div className="space-y-1">
              {goal.tasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  goalId={goal.id}
                  onToggle={toggleTask}
                  onAddSubtask={(taskId, taskTitle) => onAddTask(goal.id, goal.title, taskId, taskTitle)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-2">No tasks yet</p>
          )}
          
          {/* Add Task Button */}
          <button
            onClick={() => onAddTask(goal.id, goal.title)}
            className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-text-muted hover:text-accent-primary hover:bg-accent-surface/50 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      )}
    </Card>
  );
}

function TaskItem({ 
  task, 
  goalId,
  onToggle,
  onAddSubtask,
  isSubtask = false,
}: { 
  task: Task | Subtask; 
  goalId: string;
  onToggle: (taskId: string, completed: boolean) => void;
  onAddSubtask: (taskId: string, taskTitle: string) => void;
  isSubtask?: boolean;
}) {
  const [showSubtasks, setShowSubtasks] = useState(true);
  const hasSubtasks = "subtasks" in task && task.subtasks.length > 0;

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "high": return "bg-red-500";
      case "medium": return "bg-amber-500";
      case "low": return "bg-green-500";
      default: return null;
    }
  };

  return (
    <div className="group">
      <div className={cn(
        "flex items-center gap-2 py-1.5",
        isSubtask && "pl-8 border-l-2 border-border-subtle ml-2"
      )}>
        {/* Expand/Collapse for tasks with subtasks */}
        {hasSubtasks && (
          <button
            onClick={() => setShowSubtasks(!showSubtasks)}
            className="p-0.5 text-text-muted hover:text-text-main shrink-0"
          >
            <ChevronRight className={cn(
              "w-3 h-3 transition-transform",
              showSubtasks && "rotate-90"
            )} />
          </button>
        )}
        {!hasSubtasks && !isSubtask && <div className="w-4 shrink-0" />}
        
        {/* Checkbox */}
        <button
          onClick={() => onToggle(task.id, task.completed)}
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
            task.completed 
              ? "bg-accent-primary border-accent-primary text-white" 
              : "border-border-medium hover:border-accent-primary"
          )}
        >
          {task.completed && <Check className="w-3 h-3" />}
        </button>
        
        {/* Priority indicator */}
        {task.priority && (
          <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", getPriorityColor(task.priority))} />
        )}
        
        {/* Title */}
        <span className={cn(
          "text-sm flex-1 min-w-0",
          task.completed && "line-through text-text-muted",
          isSubtask && "text-text-muted"
        )}>
          {task.title}
        </span>
        
        {/* Due date - fixed width for alignment */}
        <span className="text-xs text-text-light w-14 text-right shrink-0">
          {task.dueDate 
            ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : ""
          }
        </span>
        
        {/* Add subtask button (only for top-level tasks) */}
        {!isSubtask && (
          <button
            onClick={() => onAddSubtask(task.id, task.title)}
            className="p-1 text-text-light opacity-0 group-hover:opacity-100 hover:text-accent-primary transition-all shrink-0"
            title="Add subtask"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
      
      {/* Subtasks */}
      {hasSubtasks && showSubtasks && (
        <div className="space-y-0.5">
          {(task as Task).subtasks.map(subtask => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              goalId={goalId}
              onToggle={onToggle}
              onAddSubtask={onAddSubtask}
              isSubtask
            />
          ))}
        </div>
      )}
    </div>
  );
}
