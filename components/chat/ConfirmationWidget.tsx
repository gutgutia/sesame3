"use client";

import React, { useState, useCallback } from "react";
import {
  Check, X, PenTool, Trophy, Users,
  Upload, FlaskConical, School, Target, User,
  Loader2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Widget types - removed "gpa" (triggers course upload), "course" replaced with "transcript"
export type WidgetType =
  | "sat"
  | "act"
  | "activity"
  | "award"
  | "transcript"  // Replaces "course" - triggers transcript upload
  | "program"
  | "goal"
  | "school"
  | "profile";

interface ConfirmationWidgetProps {
  type: WidgetType;
  data: Record<string, unknown>;
  onConfirm: (data: Record<string, unknown>) => void;
  onDismiss: () => void;
}

const icons: Record<WidgetType, React.ElementType> = {
  sat: PenTool,
  act: PenTool,
  activity: Users,
  award: Trophy,
  transcript: Upload,
  program: FlaskConical,
  goal: Target,
  school: School,
  profile: User,
};

const titles: Record<WidgetType, string> = {
  sat: "SAT Score",
  act: "ACT Score",
  activity: "Activity",
  award: "Award",
  transcript: "Upload Transcript",
  program: "Program",
  goal: "Goal",
  school: "School",
  profile: "Profile Info",
};

export function ConfirmationWidget({ type, data, onConfirm, onDismiss }: ConfirmationWidgetProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(data);

  const Icon = icons[type] || Target;
  const title = titles[type] || "Confirm";

  const updateField = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirm = () => {
    onConfirm(formData);
  };

  // Special handling for transcript upload widget
  if (type === "transcript") {
    return (
      <TranscriptUploadWidget
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />
    );
  }

  // Special handling for school widget (pre-filled from database)
  if (type === "school") {
    return (
      <SchoolConfirmWidget
        data={formData}
        onChange={updateField}
        onConfirm={handleConfirm}
        onDismiss={onDismiss}
      />
    );
  }

  // Special handling for program widget (pre-filled from database)
  if (type === "program") {
    return (
      <ProgramConfirmWidget
        data={formData}
        onChange={updateField}
        onConfirm={handleConfirm}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-accent-primary" />
          <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
            Confirm {title}
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white rounded transition-colors text-text-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Fields based on type */}
      <div className="space-y-3">
        {type === "sat" && (
          <SATFields data={formData} onChange={updateField} />
        )}

        {type === "act" && (
          <ACTFields data={formData} onChange={updateField} />
        )}

        {type === "activity" && (
          <ActivityFields data={formData} onChange={updateField} />
        )}

        {type === "award" && (
          <AwardFields data={formData} onChange={updateField} />
        )}

        {type === "goal" && (
          <GoalFields data={formData} onChange={updateField} />
        )}

        {type === "profile" && (
          <ProfileFields data={formData} onChange={updateField} />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={handleConfirm}
          className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2.5 bg-white border border-border-medium rounded-lg text-sm font-medium text-text-muted hover:text-text-main transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// FIELD COMPONENTS
// =============================================================================

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs text-text-muted mb-1">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

function TextField({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
}: {
  value: string | number | undefined;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "date";
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={cn(
        "w-full bg-white border border-border-medium rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent-primary outline-none",
        required && !value && "border-red-200"
      )}
    />
  );
}

function SelectField({
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  value: string | undefined;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={cn(
        "w-full bg-white border border-border-medium rounded-lg px-3 py-2 text-sm text-text-main focus:border-accent-primary outline-none",
        required && !value && "border-red-200"
      )}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

// =============================================================================
// SAT FIELDS - All required, aligned to API (total, math, reading, testDate)
// =============================================================================

function SATFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Math</FieldLabel>
          <TextField
            type="number"
            value={data.math as number}
            onChange={(v) => onChange("math", parseInt(v) || undefined)}
            placeholder="200-800"
            required
          />
        </div>
        <div>
          <FieldLabel required>Reading/Writing</FieldLabel>
          <TextField
            type="number"
            value={data.reading as number}
            onChange={(v) => onChange("reading", parseInt(v) || undefined)}
            placeholder="200-800"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Total</FieldLabel>
          <div className="bg-bg-sidebar border border-border-medium rounded-lg px-3 py-2 text-sm font-mono font-semibold text-accent-primary">
            {((data.math as number) || 0) + ((data.reading as number) || 0) || "—"}
          </div>
        </div>
        <div>
          <FieldLabel required>Test Date</FieldLabel>
          <TextField
            type="date"
            value={data.testDate as string}
            onChange={(v) => onChange("testDate", v || undefined)}
            required
          />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// ACT FIELDS - All sections required, includes test date
// =============================================================================

function ACTFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  // Calculate composite from sections
  const sections = [
    (data.english as number) || 0,
    (data.math as number) || 0,
    (data.reading as number) || 0,
    (data.science as number) || 0,
  ];
  const validSections = sections.filter(s => s > 0);
  const composite = validSections.length === 4
    ? Math.round(sections.reduce((a, b) => a + b, 0) / 4)
    : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>English</FieldLabel>
          <TextField
            type="number"
            value={data.english as number}
            onChange={(v) => onChange("english", parseInt(v) || undefined)}
            placeholder="1-36"
            required
          />
        </div>
        <div>
          <FieldLabel required>Math</FieldLabel>
          <TextField
            type="number"
            value={data.math as number}
            onChange={(v) => onChange("math", parseInt(v) || undefined)}
            placeholder="1-36"
            required
          />
        </div>
        <div>
          <FieldLabel required>Reading</FieldLabel>
          <TextField
            type="number"
            value={data.reading as number}
            onChange={(v) => onChange("reading", parseInt(v) || undefined)}
            placeholder="1-36"
            required
          />
        </div>
        <div>
          <FieldLabel required>Science</FieldLabel>
          <TextField
            type="number"
            value={data.science as number}
            onChange={(v) => onChange("science", parseInt(v) || undefined)}
            placeholder="1-36"
            required
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Composite</FieldLabel>
          <div className="bg-bg-sidebar border border-border-medium rounded-lg px-3 py-2 text-sm font-mono font-semibold text-accent-primary">
            {composite || "—"}
          </div>
        </div>
        <div>
          <FieldLabel required>Test Date</FieldLabel>
          <TextField
            type="date"
            value={data.testDate as string}
            onChange={(v) => onChange("testDate", v || undefined)}
            required
          />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// ACTIVITY FIELDS - Added hours/week, aligned to API
// =============================================================================

function ActivityFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <>
      <div>
        <FieldLabel required>Role/Position</FieldLabel>
        <TextField
          value={data.title as string}
          onChange={(v) => onChange("title", v)}
          placeholder="e.g., President, Captain, Volunteer"
          required
        />
      </div>
      <div>
        <FieldLabel required>Organization</FieldLabel>
        <TextField
          value={data.organization as string}
          onChange={(v) => onChange("organization", v)}
          placeholder="e.g., Robotics Club, Debate Team"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Category</FieldLabel>
          <SelectField
            value={data.category as string}
            onChange={(v) => onChange("category", v)}
            placeholder="Select"
            options={[
              { value: "club", label: "Club" },
              { value: "sport", label: "Sport" },
              { value: "arts", label: "Arts" },
              { value: "volunteer", label: "Volunteer" },
              { value: "work", label: "Work" },
              { value: "family", label: "Family" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Hours/Week</FieldLabel>
          <TextField
            type="number"
            value={data.hoursPerWeek as number}
            onChange={(v) => onChange("hoursPerWeek", parseFloat(v) || undefined)}
            placeholder="e.g., 10"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isLeadership"
          checked={data.isLeadership as boolean ?? false}
          onChange={(e) => onChange("isLeadership", e.target.checked)}
          className="rounded border-border-medium"
        />
        <label htmlFor="isLeadership" className="text-sm text-text-main">
          Leadership role
        </label>
      </div>
    </>
  );
}

// =============================================================================
// AWARD FIELDS
// =============================================================================

function AwardFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <>
      <div>
        <FieldLabel required>Award Name</FieldLabel>
        <TextField
          value={data.title as string}
          onChange={(v) => onChange("title", v)}
          placeholder="e.g., AIME Qualifier, National Merit Semifinalist"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Level</FieldLabel>
          <SelectField
            value={data.level as string}
            onChange={(v) => onChange("level", v)}
            placeholder="Select"
            required
            options={[
              { value: "school", label: "School" },
              { value: "regional", label: "Regional" },
              { value: "state", label: "State" },
              { value: "national", label: "National" },
              { value: "international", label: "International" },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Year</FieldLabel>
          <TextField
            type="number"
            value={data.year as number}
            onChange={(v) => onChange("year", parseInt(v) || undefined)}
            placeholder="e.g., 2024"
          />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// GOAL FIELDS
// =============================================================================

function GoalFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <>
      <div>
        <FieldLabel required>Goal</FieldLabel>
        <TextField
          value={data.title as string}
          onChange={(v) => onChange("title", v)}
          placeholder="What do you want to achieve?"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>Category</FieldLabel>
          <SelectField
            value={data.category as string}
            onChange={(v) => onChange("category", v)}
            placeholder="Select"
            required
            options={[
              { value: "research", label: "Research" },
              { value: "competition", label: "Competition" },
              { value: "leadership", label: "Leadership" },
              { value: "project", label: "Project" },
              { value: "academic", label: "Academic" },
              { value: "application", label: "Application" },
              { value: "other", label: "Other" },
            ]}
          />
        </div>
        <div>
          <FieldLabel>Target Date</FieldLabel>
          <TextField
            type="date"
            value={data.targetDate as string}
            onChange={(v) => onChange("targetDate", v)}
          />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// PROFILE FIELDS
// =============================================================================

function ProfileFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>First Name</FieldLabel>
          <TextField
            value={data.firstName as string}
            onChange={(v) => onChange("firstName", v)}
            placeholder="Your first name"
            required
          />
        </div>
        <div>
          <FieldLabel>Preferred Name</FieldLabel>
          <TextField
            value={data.preferredName as string}
            onChange={(v) => onChange("preferredName", v)}
            placeholder="Nickname"
          />
        </div>
      </div>
      <div>
        <FieldLabel required>Grade</FieldLabel>
        <SelectField
          value={data.grade as string}
          onChange={(v) => onChange("grade", v)}
          placeholder="Select grade"
          required
          options={[
            { value: "9th", label: "9th Grade (Freshman)" },
            { value: "10th", label: "10th Grade (Sophomore)" },
            { value: "11th", label: "11th Grade (Junior)" },
            { value: "12th", label: "12th Grade (Senior)" },
            { value: "gap_year", label: "Gap Year" },
          ]}
        />
      </div>
      <div>
        <FieldLabel>High School</FieldLabel>
        <TextField
          value={data.highSchoolName as string}
          onChange={(v) => onChange("highSchoolName", v)}
          placeholder="Your high school name"
        />
      </div>
    </>
  );
}

// =============================================================================
// TRANSCRIPT UPLOAD WIDGET - Replaces course widget
// =============================================================================

function TranscriptUploadWidget({
  onConfirm,
  onDismiss
}: {
  onConfirm: (data: Record<string, unknown>) => void;
  onDismiss: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setError(null);
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF or image");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File must be under 20MB");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/profile/courses/extract", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to extract");
      }

      const result = await response.json();
      // Signal success with extracted courses
      onConfirm({
        type: "transcript_extracted",
        courses: result.courses,
        count: result.courses.length,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process transcript");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-md">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-accent-primary" />
          <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
            Add Courses
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white rounded transition-colors text-text-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isUploading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-accent-primary animate-spin mb-2" />
          <p className="text-sm text-text-main">Analyzing transcript...</p>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer",
            isDragging
              ? "border-accent-primary bg-accent-surface/50"
              : "border-border-medium hover:border-accent-primary"
          )}
        >
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className={cn(
            "w-8 h-8 mx-auto mb-2",
            isDragging ? "text-accent-primary" : "text-text-light"
          )} />
          <p className="text-sm font-medium text-text-main">Upload transcript</p>
          <p className="text-xs text-text-muted mt-1">PDF or image • Drop or click</p>
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
        <a
          href="/profile/courses"
          className="text-xs text-accent-primary hover:underline flex items-center gap-1"
        >
          Enter manually
          <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={onDismiss}
          className="text-xs text-text-muted hover:text-text-main"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// SCHOOL CONFIRM WIDGET - Pre-filled from database lookup, just pick tier
// =============================================================================

function SchoolConfirmWidget({
  data,
  onChange,
  onConfirm,
  onDismiss,
}: {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const schoolName = (data.name as string) || (data.schoolName as string) || "Unknown School";
  const schoolId = data.schoolId as string;
  const location = data.location as string;

  return (
    <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <School className="w-5 h-5 text-accent-primary" />
          <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
            Add to List
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white rounded transition-colors text-text-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* School Card */}
      <div className="bg-white rounded-lg p-3 mb-3 border border-border-subtle">
        <div className="font-semibold text-text-main">{schoolName}</div>
        {location && (
          <div className="text-xs text-text-muted mt-0.5">{location}</div>
        )}
      </div>

      {/* Tier Selection */}
      <div className="mb-4">
        <FieldLabel required>How would you categorize this school?</FieldLabel>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { value: "reach", label: "Reach", color: "bg-red-50 border-red-200 text-red-700" },
            { value: "target", label: "Target", color: "bg-amber-50 border-amber-200 text-amber-700" },
            { value: "safety", label: "Safety", color: "bg-green-50 border-green-200 text-green-700" },
            { value: "dream", label: "Dream ✨", color: "bg-purple-50 border-purple-200 text-purple-700" },
          ].map(tier => (
            <button
              key={tier.value}
              onClick={() => onChange("tier", tier.value)}
              className={cn(
                "py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                data.tier === tier.value
                  ? tier.color + " ring-2 ring-offset-1 ring-accent-primary"
                  : "bg-white border-border-medium text-text-main hover:border-accent-primary"
              )}
            >
              {tier.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={!data.tier || !schoolId}
          className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          Add to List
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2.5 bg-white border border-border-medium rounded-lg text-sm font-medium text-text-muted hover:text-text-main transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// PROGRAM CONFIRM WIDGET - Pre-filled from database lookup
// =============================================================================

function ProgramConfirmWidget({
  data,
  onChange,
  onConfirm,
  onDismiss,
}: {
  data: Record<string, unknown>;
  onChange: (field: string, value: unknown) => void;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const programName = (data.name as string) || "Unknown Program";
  const organization = data.organization as string;
  const programId = data.programId as string;
  const type = data.type as string;
  const selectivity = data.selectivity as string;

  return (
    <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-sm">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-accent-primary" />
          <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
            Add Program
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white rounded transition-colors text-text-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Program Card */}
      <div className="bg-white rounded-lg p-3 mb-3 border border-border-subtle">
        <div className="font-semibold text-text-main">{programName}</div>
        {organization && (
          <div className="text-xs text-text-muted mt-0.5">{organization}</div>
        )}
        <div className="flex gap-2 mt-2">
          {type && (
            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase">
              {type}
            </span>
          )}
          {selectivity && (
            <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
              {selectivity}
            </span>
          )}
        </div>
      </div>

      {/* Status Selection */}
      <div className="mb-4">
        <FieldLabel required>What&apos;s your status?</FieldLabel>
        <SelectField
          value={data.status as string}
          onChange={(v) => onChange("status", v)}
          placeholder="Select status"
          required
          options={[
            { value: "interested", label: "Interested" },
            { value: "applying", label: "Planning to Apply" },
            { value: "applied", label: "Applied" },
            { value: "accepted", label: "Accepted" },
            { value: "attending", label: "Attending/Attended" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={!data.status}
          className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          Add to List
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-2.5 bg-white border border-border-medium rounded-lg text-sm font-medium text-text-muted hover:text-text-main transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
