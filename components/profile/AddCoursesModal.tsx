"use client";

import React, { useState, useCallback } from "react";
import { Upload, List, Plus, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CourseForm } from "./CourseForm";
import { BulkCourseEditor } from "./BulkCourseEditor";
import { cn } from "@/lib/utils";

type AddMode = "choose" | "single" | "bulk";

interface AddCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export function AddCoursesModal({ isOpen, onClose, onSave }: AddCoursesModalProps) {
  const [mode, setMode] = useState<AddMode>("choose");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractedCourses, setExtractedCourses] = useState<Array<{
    name: string;
    subject: string;
    level: string;
    gradeLevel: string;
    grade?: string;
    isDuplicate?: boolean;
    isPotentialDuplicate?: boolean;
    existingName?: string;
  }> | null>(null);

  const resetState = () => {
    setMode("choose");
    setIsDragging(false);
    setIsUploading(false);
    setUploadError(null);
    setExtractedCourses(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // File handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Please upload a PDF or image (PNG, JPEG, WebP)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError("File must be under 20MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/courses/extract", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to extract courses");
      }
      const result = await response.json();

      if (result.courses && result.courses.length > 0) {
        setExtractedCourses(result.courses);
        setMode("bulk");
      } else {
        setUploadError("No courses found in transcript. Try adding manually.");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to process transcript");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSingleSave = async (data: Record<string, unknown>) => {
    const response = await fetch("/api/profile/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (response.ok) {
      await onSave();
      handleClose();
    }
  };

  const handleBulkSave = async (courses: { name: string; subject: string; level: string; gradeLevel: string; grade: string }[]) => {
    const response = await fetch("/api/profile/courses/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courses }),
    });
    if (response.ok) {
      await onSave();
      handleClose();
    }
  };

  // Modal size based on mode
  const modalSize = mode === "bulk" ? "xl" : mode === "single" ? "lg" : "lg";

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "choose" ? "Add Courses" : mode === "single" ? "Add Course" : "Add Courses"}
      description={
        mode === "choose"
          ? "Choose how you'd like to add your courses"
          : mode === "single"
          ? "Add a course to your transcript"
          : "Review and save your courses"
      }
      size={modalSize}
    >
      {mode === "choose" && (
        <div className="flex flex-col gap-6">
          {/* Primary: Transcript Upload */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-main">Upload Transcript</span>
              <span className="px-2 py-0.5 text-[10px] font-medium text-accent-primary bg-accent-surface rounded-full">
                Recommended
              </span>
            </div>

            {isUploading ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border-medium rounded-2xl">
                <Loader2 className="w-8 h-8 text-accent-primary animate-spin mb-3" />
                <p className="text-text-main font-medium">Analyzing transcript...</p>
                <p className="text-sm text-text-muted mt-1">This may take a moment</p>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer",
                  isDragging
                    ? "border-accent-primary bg-accent-surface/20"
                    : "border-border-medium hover:border-accent-primary hover:bg-accent-surface/10"
                )}
              >
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload
                  className={cn(
                    "w-10 h-10 mx-auto mb-4",
                    isDragging ? "text-accent-primary" : "text-text-light"
                  )}
                />
                <p className="text-lg font-medium text-text-main">
                  Drag and drop your transcript
                </p>
                <p className="text-sm text-text-muted mt-1">
                  or click to browse
                </p>
                <p className="text-xs text-text-light mt-3">
                  PDF, PNG, JPEG (max 20MB)
                </p>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-xs text-text-muted">or add manually</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Secondary: Manual Options */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                setExtractedCourses(null);
                setMode("bulk");
              }}
              className="flex flex-col items-center gap-3 p-5 border border-border-subtle rounded-xl hover:border-accent-primary hover:bg-accent-surface/10 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 group-hover:bg-purple-200 transition-colors">
                <List className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="font-medium text-text-main">Add Multiple</div>
                <div className="text-xs text-text-muted mt-0.5">Enter in a table</div>
              </div>
            </button>

            <button
              onClick={() => setMode("single")}
              className="flex flex-col items-center gap-3 p-5 border border-border-subtle rounded-xl hover:border-accent-primary hover:bg-accent-surface/10 transition-all text-left group"
            >
              <div className="w-10 h-10 bg-accent-surface rounded-lg flex items-center justify-center text-accent-primary group-hover:bg-accent-primary/20 transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-center">
                <div className="font-medium text-text-main">Add Single</div>
                <div className="text-xs text-text-muted mt-0.5">One course at a time</div>
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "single" && (
        <div>
          <button
            onClick={() => setMode("choose")}
            className="text-sm text-text-muted hover:text-accent-primary mb-4 transition-colors"
          >
            &larr; Back to options
          </button>
          <CourseForm
            onSubmit={handleSingleSave}
            onCancel={handleClose}
          />
        </div>
      )}

      {mode === "bulk" && (
        <div>
          <button
            onClick={() => {
              setExtractedCourses(null);
              setMode("choose");
            }}
            className="text-sm text-text-muted hover:text-accent-primary mb-4 transition-colors"
          >
            &larr; Back to options
          </button>
          <BulkCourseEditor
            onSave={handleBulkSave}
            onCancel={handleClose}
          />
        </div>
      )}
    </Modal>
  );
}
