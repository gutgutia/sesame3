"use client";

import React, { useState, useCallback } from "react";
import { 
  Upload, 
  Plus, 
  Trash2, 
  Loader2, 
  AlertTriangle,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type EditorMode = "upload" | "manual";

interface CourseRow {
  id: string;
  name: string;
  subject: string;
  level: string;
  gradeLevel: string;
  grade: string;
  isDuplicate?: boolean;
  isPotentialDuplicate?: boolean;
  existingName?: string;
}

interface BulkCourseEditorProps {
  onSave: (courses: Omit<CourseRow, "id" | "isDuplicate" | "isPotentialDuplicate" | "existingName">[]) => Promise<void>;
  onCancel: () => void;
}

const SUBJECT_OPTIONS = [
  { value: "", label: "—" },
  { value: "Math", label: "Math" },
  { value: "Science", label: "Science" },
  { value: "English", label: "English" },
  { value: "History", label: "History" },
  { value: "Language", label: "Language" },
  { value: "Arts", label: "Arts" },
  { value: "Computer Science", label: "CS" },
  { value: "Other", label: "Other" },
];

const LEVEL_OPTIONS = [
  { value: "", label: "—" },
  { value: "regular", label: "Regular" },
  { value: "honors", label: "Honors" },
  { value: "ap", label: "AP" },
  { value: "ib", label: "IB" },
  { value: "college", label: "College" },
];

const GRADE_LEVEL_OPTIONS = [
  { value: "", label: "—" },
  { value: "9th", label: "9th" },
  { value: "10th", label: "10th" },
  { value: "11th", label: "11th" },
  { value: "12th", label: "12th" },
];

const GRADE_OPTIONS = [
  { value: "", label: "—" },
  { value: "A+", label: "A+" },
  { value: "A", label: "A" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B", label: "B" },
  { value: "B-", label: "B-" },
  { value: "C+", label: "C+" },
  { value: "C", label: "C" },
  { value: "C-", label: "C-" },
  { value: "D+", label: "D+" },
  { value: "D", label: "D" },
  { value: "D-", label: "D-" },
  { value: "F", label: "F" },
  { value: "P", label: "P" },
];

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function createEmptyRow(): CourseRow {
  return { id: generateId(), name: "", subject: "", level: "", gradeLevel: "", grade: "" };
}

export function BulkCourseEditor({ onSave, onCancel }: BulkCourseEditorProps) {
  const [mode, setMode] = useState<EditorMode>("upload");
  const [courses, setCourses] = useState<CourseRow[]>([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const validCourseCount = courses.filter(c => c.name.trim()).length;
  const duplicateCount = courses.filter(c => c.isDuplicate).length;
  const savableCount = validCourseCount - duplicateCount;

  // File handlers
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
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
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) { setUploadError("Please upload an image (PNG, JPEG, WebP)"); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError("File must be under 10MB"); return; }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/courses/extract", { method: "POST", body: formData });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || "Failed to extract"); }
      const result = await response.json();
      
      const extractedRows: CourseRow[] = result.courses.map((c: {
        name: string; subject: string; level: string; gradeLevel: string; grade?: string;
        isDuplicate?: boolean; isPotentialDuplicate?: boolean; existingName?: string;
      }) => ({
        id: generateId(), name: c.name, subject: c.subject || "", level: c.level || "",
        gradeLevel: c.gradeLevel || "", grade: c.grade || "",
        isDuplicate: c.isDuplicate, isPotentialDuplicate: c.isPotentialDuplicate, existingName: c.existingName,
      }));

      if (extractedRows.length > 0) {
        setCourses(extractedRows);
        setMode("manual");
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to process transcript");
    } finally {
      setIsUploading(false);
    }
  };

  // Row manipulation
  const addRow = () => setCourses([...courses, createEmptyRow()]);
  const deleteRow = (id: string) => {
    const filtered = courses.filter(c => c.id !== id);
    setCourses(filtered.length ? filtered : [createEmptyRow()]);
  };
  const updateRow = (id: string, field: keyof CourseRow, value: string) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    const validCourses = courses
      .filter(c => c.name.trim() && !c.isDuplicate)
      .map(({ id, isDuplicate, isPotentialDuplicate, existingName, ...course }) => course);
    if (!validCourses.length) return;
    setIsSaving(true);
    try { await onSave(validCourses); } finally { setIsSaving(false); }
  };

  // ==========================================================================
  // UPLOAD MODE
  // ==========================================================================
  if (mode === "upload") {
    return (
      <div className="flex flex-col gap-6">
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-accent-primary animate-spin mb-3" />
            <p className="text-text-main font-medium">Analyzing transcript...</p>
          </div>
        ) : (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative border-2 border-dashed rounded-2xl p-16 text-center transition-all cursor-pointer",
              isDragging ? "border-accent-primary bg-accent-surface/20" : "border-border-medium hover:border-accent-primary"
            )}
          >
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Upload className={cn("w-10 h-10 mx-auto mb-4", isDragging ? "text-accent-primary" : "text-text-light")} />
            <p className="text-lg font-medium text-text-main">Upload your transcript</p>
            <p className="text-sm text-text-muted mt-1">Drop an image or click to browse</p>
          </div>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            <AlertTriangle className="w-4 h-4" />
            {uploadError}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <button
            onClick={() => setMode("manual")}
            className="text-sm text-text-muted hover:text-accent-primary transition-colors underline"
          >
            Enter manually instead
          </button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // MANUAL MODE
  // ==========================================================================
  return (
    <div className="flex flex-col gap-4">
      {/* Duplicate warnings */}
      {(duplicateCount > 0 || courses.some(c => c.isPotentialDuplicate)) && (
        <div className="flex gap-2 text-xs">
          {duplicateCount > 0 && (
            <span className="px-2 py-1 bg-red-50 rounded text-red-600">
              {duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""} skipped
            </span>
          )}
          {courses.some(c => c.isPotentialDuplicate && !c.isDuplicate) && (
            <span className="px-2 py-1 bg-yellow-50 rounded text-yellow-700">
              Some may already exist
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className="border border-border-subtle rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-sidebar text-[11px] text-text-muted uppercase tracking-wider">
            <tr>
              <th className="text-left py-2 px-3 font-medium">Course</th>
              <th className="text-left py-2 px-2 font-medium w-[85px]">Subject</th>
              <th className="text-left py-2 px-2 font-medium w-[75px]">Level</th>
              <th className="text-left py-2 px-2 font-medium w-[55px]">Year</th>
              <th className="text-left py-2 px-2 font-medium w-[50px]">Grade</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr
                key={course.id}
                className={cn(
                  "border-t border-border-subtle",
                  course.isDuplicate && "bg-red-50/40 opacity-50",
                  course.isPotentialDuplicate && !course.isDuplicate && "bg-yellow-50/40"
                )}
              >
                <td className="py-1 px-1">
                  <input
                    type="text"
                    value={course.name}
                    onChange={(e) => updateRow(course.id, "name", e.target.value)}
                    placeholder="Course name"
                    disabled={course.isDuplicate}
                    className="w-full px-2 py-1.5 rounded border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-accent-primary text-sm"
                  />
                </td>
                <td className="py-1 px-1">
                  <select
                    value={course.subject}
                    onChange={(e) => updateRow(course.id, "subject", e.target.value)}
                    disabled={course.isDuplicate}
                    className="w-full px-1 py-1.5 rounded border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-accent-primary text-xs"
                  >
                    {SUBJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-1 px-1">
                  <select
                    value={course.level}
                    onChange={(e) => updateRow(course.id, "level", e.target.value)}
                    disabled={course.isDuplicate}
                    className={cn(
                      "w-full px-1 py-1.5 rounded border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-accent-primary text-xs font-medium",
                      course.level === "ap" && "text-red-600",
                      course.level === "honors" && "text-blue-600",
                    )}
                  >
                    {LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-1 px-1">
                  <select
                    value={course.gradeLevel}
                    onChange={(e) => updateRow(course.id, "gradeLevel", e.target.value)}
                    disabled={course.isDuplicate}
                    className="w-full px-1 py-1.5 rounded border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-accent-primary text-xs"
                  >
                    {GRADE_LEVEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-1 px-1">
                  <select
                    value={course.grade}
                    onChange={(e) => updateRow(course.id, "grade", e.target.value)}
                    disabled={course.isDuplicate}
                    className="w-full px-1 py-1.5 rounded border-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-accent-primary text-xs font-mono"
                  >
                    {GRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td className="py-1 pr-2">
                  <button
                    onClick={() => deleteRow(course.id)}
                    className="p-1 text-text-light hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addRow}
          className="w-full py-2 text-xs text-accent-primary hover:bg-accent-surface/30 transition-colors border-t border-border-subtle flex items-center justify-center gap-1"
        >
          <Plus className="w-3 h-3" /> Add row
        </button>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <button
          onClick={() => setMode("upload")}
          className="text-sm text-text-muted hover:text-accent-primary transition-colors underline"
        >
          Upload transcript instead
        </button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onCancel} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={savableCount === 0 || isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isSaving ? "Saving..." : savableCount > 0 ? `Save ${savableCount} Course${savableCount > 1 ? "s" : ""}` : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
