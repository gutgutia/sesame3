"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  GraduationCap, 
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
  Filter,
  ChevronDown,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { CourseForm, BulkCourseEditor } from "@/components/profile";
import { calculateGPA, formatGPA } from "@/lib/gpa-calculator";

type AddMode = "single" | "bulk";

type FilterLevel = "all" | "ap" | "honors" | "regular";

export default function CoursesPage() {
  const { profile, isLoading, error, refreshProfile } = useProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Record<string, unknown> | null>(null);
  const [filterLevel, setFilterLevel] = useState<FilterLevel>("all");
  
  // Add course modes: single form or bulk editor
  const [addMode, setAddMode] = useState<AddMode>("single");
  const [showAddDropdown, setShowAddDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const courses = profile?.courses || [];
  const gpaResult = calculateGPA(courses);

  // Filter courses
  const filteredCourses = courses.filter(course => {
    if (filterLevel === "all") return true;
    if (filterLevel === "ap") return course.level === "ap" || course.level === "ib" || course.level === "college";
    if (filterLevel === "honors") return course.level === "honors";
    if (filterLevel === "regular") return course.level === "regular" || !course.level;
    return true;
  });

  // Group by grade level
  const coursesByGrade = filteredCourses.reduce((acc, course) => {
    const grade = course.gradeLevel || "Other";
    if (!acc[grade]) acc[grade] = [];
    acc[grade].push(course);
    return acc;
  }, {} as Record<string, typeof courses>);

  const gradeOrder = ["9th", "10th", "11th", "12th", "Other"];
  const sortedGrades = Object.keys(coursesByGrade).sort(
    (a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b)
  );

  const handleSaveCourse = async (data: Record<string, unknown>) => {
    const isEdit = !!editingCourse?.id;
    const response = await fetch(
      isEdit ? `/api/profile/courses/${editingCourse.id}` : "/api/profile/courses",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (response.ok) {
      await refreshProfile();
      closeModal();
    }
  };

  const handleDeleteCourse = async (id: string) => {
    await fetch(`/api/profile/courses/${id}`, { method: "DELETE" });
    refreshProfile();
  };

  const openAddModal = (mode: AddMode = "single") => {
    setAddMode(mode);
    setEditingCourse(null);
    setIsModalOpen(true);
    setShowAddDropdown(false);
  };

  const openEditModal = (course: Record<string, unknown>) => {
    setAddMode("single");
    setEditingCourse(course);
    setIsModalOpen(true);
  };

  const handleBulkSave = async (coursesToSave: { name: string; subject: string; level: string; gradeLevel: string; grade: string }[]) => {
    const response = await fetch("/api/profile/courses/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courses: coursesToSave }),
    });
    
    if (response.ok) {
      await refreshProfile();
      closeModal();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
    setAddMode("single");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <p className="text-text-muted mb-4">Failed to load profile</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link 
          href="/profile" 
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Profile
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-surface rounded-xl flex items-center justify-center text-accent-primary">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-text-main">Courses</h1>
              <p className="text-text-muted">Your coursework and academic record</p>
            </div>
          </div>
          
          {/* Add Courses Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button onClick={() => setShowAddDropdown(!showAddDropdown)}>
              <Plus className="w-4 h-4" />
              Add Courses
              <ChevronDown className={cn("w-4 h-4 transition-transform", showAddDropdown && "rotate-180")} />
            </Button>
            
            {showAddDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl border border-border-subtle shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => openAddModal("single")}
                  className="w-full flex items-start gap-3 p-4 hover:bg-bg-sidebar transition-colors text-left"
                >
                  <div className="w-9 h-9 bg-accent-surface rounded-lg flex items-center justify-center text-accent-primary shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-text-main">Add Single Course</div>
                    <div className="text-xs text-text-muted">Quick add one course at a time</div>
                  </div>
                </button>
                
                <div className="border-t border-border-subtle" />
                
                <button
                  onClick={() => openAddModal("bulk")}
                  className="w-full flex items-start gap-3 p-4 hover:bg-bg-sidebar transition-colors text-left"
                >
                  <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0">
                    <List className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-medium text-text-main">Add Multiple Courses</div>
                    <div className="text-xs text-text-muted">Upload transcript or enter manually in bulk</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GPA Summary Bar */}
      <div className="bg-white border border-border-subtle rounded-[16px] p-5 mb-6 shadow-card">
        <div className="flex flex-wrap items-center gap-6 md:gap-10">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Unweighted GPA</div>
            <div className="text-2xl font-mono font-bold text-accent-primary">{formatGPA(gpaResult.unweighted)}</div>
          </div>
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Weighted GPA</div>
            <div className="text-2xl font-mono font-bold text-accent-primary">{formatGPA(gpaResult.weighted)}</div>
          </div>
          <div className="hidden md:block h-10 w-px bg-border-subtle" />
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-text-main">{gpaResult.courseCount}</div>
              <div className="text-xs text-text-muted">Courses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{gpaResult.apCount}</div>
              <div className="text-xs text-text-muted">AP/IB</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{gpaResult.honorsCount}</div>
              <div className="text-xs text-text-muted">Honors</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-4 h-4 text-text-muted" />
        <div className="flex gap-1">
          {[
            { value: "all", label: "All" },
            { value: "ap", label: "AP/IB" },
            { value: "honors", label: "Honors" },
            { value: "regular", label: "Regular" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilterLevel(value as FilterLevel)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                filterLevel === value
                  ? "bg-accent-primary text-white"
                  : "text-text-muted hover:bg-bg-sidebar"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Course List */}
      {courses.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-[20px] p-12 text-center shadow-card">
          <GraduationCap className="w-12 h-12 text-text-light mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-text-main mb-2">No courses yet</h3>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            Add your courses to calculate your GPA automatically. 
            You can add them one at a time or upload your transcript.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => openAddModal("single")}>
              <Plus className="w-4 h-4" />
              Add Single Course
            </Button>
            <Button onClick={() => openAddModal("bulk")}>
              <List className="w-4 h-4" />
              Add Multiple Courses
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGrades.map(grade => (
            <div key={grade}>
              <h3 className="font-display font-bold text-text-main mb-3 flex items-center gap-2">
                {grade === "Other" ? "Other Courses" : `${grade} Grade`}
                <span className="text-sm font-normal text-text-muted">
                  ({coursesByGrade[grade].length})
                </span>
              </h3>
              <div className="bg-white border border-border-subtle rounded-[16px] overflow-hidden shadow-card">
                {coursesByGrade[grade].map((course, i) => (
                  <div 
                    key={course.id}
                    className={cn(
                      "flex items-center justify-between p-4 group hover:bg-bg-sidebar/50 transition-colors",
                      i !== coursesByGrade[grade].length - 1 && "border-b border-border-subtle"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {course.level && course.level !== "regular" && (
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-1 rounded shrink-0",
                          course.level === "ap" && "bg-red-100 text-red-600",
                          course.level === "ib" && "bg-purple-100 text-purple-600",
                          course.level === "honors" && "bg-blue-100 text-blue-600",
                          course.level === "college" && "bg-green-100 text-green-600",
                        )}>
                          {course.level}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-text-main truncate">{course.name}</div>
                        {course.subject && (
                          <div className="text-xs text-text-muted">{course.subject}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {course.grade && (
                        <span className="font-mono font-semibold text-accent-primary text-lg">
                          {course.grade}
                        </span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(course)}
                          className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal}
        title={
          editingCourse 
            ? "Edit Course" 
            : addMode === "bulk"
              ? "Add Multiple Courses"
              : "Add Course"
        }
        description={
          addMode === "bulk"
            ? "Add courses manually or upload a transcript to extract them automatically"
            : "Add a course to your academic record"
        }
        size={addMode === "bulk" ? "xl" : "lg"}
      >
        {addMode === "single" && (
          <CourseForm
            initialData={editingCourse || undefined}
            onSubmit={handleSaveCourse}
            onCancel={closeModal}
          />
        )}
        
        {addMode === "bulk" && (
          <BulkCourseEditor
            onSave={handleBulkSave}
            onCancel={closeModal}
          />
        )}
      </Modal>
    </>
  );
}

