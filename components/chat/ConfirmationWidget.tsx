"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Check, X, PenTool, Trophy, Users,
  Upload, FlaskConical, School, Target, User,
  Loader2, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Widget types - removed "gpa" (triggers course upload), "course" replaced with "transcript"
export type WidgetType =
  // Onboarding micro-widgets - lightweight data capture
  | "name"        // firstName, lastName with proper capitalization
  | "grade"       // Grade selection (9th-12th, gap_year)
  | "highschool"  // High school name, city, state
  // Input widgets - collect data from user
  | "sat"
  | "act"
  | "activity"
  | "award"
  | "transcript"  // Replaces "course" - triggers transcript upload
  | "program"
  | "goal"
  | "school"
  | "profile"
  // Recommendation widgets - display-only, show suggestions
  | "program_recommendations"
  | "school_recommendations";

// Helper: Capitalize each word properly
function capitalizeWords(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface ConfirmationWidgetProps {
  type: WidgetType;
  data: Record<string, unknown>;
  onConfirm: (data: Record<string, unknown>) => void;
  onDismiss: () => void;
}

const icons: Record<WidgetType, React.ElementType> = {
  // Onboarding micro-widgets
  name: User,
  grade: User,
  highschool: School,
  // Standard widgets
  sat: PenTool,
  act: PenTool,
  activity: Users,
  award: Trophy,
  transcript: Upload,
  program: FlaskConical,
  goal: Target,
  school: School,
  profile: User,
  // Recommendation widgets use RecommendationCarousel, not this component
  program_recommendations: FlaskConical,
  school_recommendations: School,
};

const titles: Record<WidgetType, string> = {
  // Onboarding micro-widgets
  name: "Your Name",
  grade: "Grade Level",
  highschool: "High School",
  // Standard widgets
  sat: "SAT Score",
  act: "ACT Score",
  activity: "Activity",
  award: "Award",
  transcript: "Upload Transcript",
  program: "Program",
  goal: "Goal",
  school: "School",
  profile: "Profile Info",
  // Recommendation widgets use RecommendationCarousel, not this component
  program_recommendations: "Recommended Programs",
  school_recommendations: "Recommended Schools",
};

export function ConfirmationWidget({ type, data, onConfirm, onDismiss }: ConfirmationWidgetProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(data);

  const Icon = icons[type] || Target;
  const title = titles[type] || "Info";

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
        {type === "name" && (
          <NameFields data={formData} onChange={updateField} />
        )}

        {type === "grade" && (
          <GradeFields data={formData} onChange={updateField} />
        )}

        {type === "highschool" && (
          <HighSchoolFields data={formData} onChange={updateField} />
        )}

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
// NAME FIELDS - First name, last name with auto-capitalization
// =============================================================================

function NameFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  // Auto-capitalize on initial load
  const firstName = data.firstName as string || "";
  const lastName = data.lastName as string || "";

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel required>First Name</FieldLabel>
          <TextField
            value={capitalizeWords(firstName)}
            onChange={(v) => onChange("firstName", capitalizeWords(v))}
            placeholder="First name"
            required
          />
        </div>
        <div>
          <FieldLabel>Last Name</FieldLabel>
          <TextField
            value={capitalizeWords(lastName)}
            onChange={(v) => onChange("lastName", capitalizeWords(v))}
            placeholder="Last name"
          />
        </div>
      </div>
    </>
  );
}

// =============================================================================
// GRADE FIELDS - Grade level selection
// =============================================================================

function GradeFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  const grade = data.grade as string || "";

  return (
    <>
      <div>
        <FieldLabel required>What grade are you in?</FieldLabel>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { value: "9th", label: "9th Grade" },
            { value: "10th", label: "10th Grade" },
            { value: "11th", label: "11th Grade" },
            { value: "12th", label: "12th Grade" },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange("grade", opt.value)}
              className={cn(
                "py-2.5 px-3 rounded-lg border text-sm font-medium transition-all",
                grade === opt.value
                  ? "border-accent-primary bg-accent-surface text-accent-primary ring-2 ring-accent-primary/20"
                  : "border-border-medium bg-white text-text-main hover:border-accent-primary"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange("grade", "gap_year")}
          className={cn(
            "w-full mt-2 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
            grade === "gap_year"
              ? "border-accent-primary bg-accent-surface text-accent-primary ring-2 ring-accent-primary/20"
              : "border-border-medium bg-white text-text-muted hover:border-accent-primary hover:text-text-main"
          )}
        >
          Gap Year
        </button>
      </div>
    </>
  );
}

// =============================================================================
// HIGH SCHOOL FIELDS - School name, city, state
// =============================================================================

// US States for dropdown
const US_STATES = [
  { value: "AL", label: "Alabama" }, { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" }, { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" }, { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" }, { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" }, { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" }, { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" }, { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" }, { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" }, { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" }, { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" }, { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" }, { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" }, { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" }, { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" }, { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" }, { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" }, { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" }, { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" }, { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" }, { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" }, { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" }, { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" }, { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" }, { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" }, { value: "WY", label: "Wyoming" },
  { value: "DC", label: "Washington DC" },
];

function HighSchoolFields({ data, onChange }: { data: Record<string, unknown>; onChange: (field: string, value: unknown) => void }) {
  const name = data.name as string || "";
  const city = data.city as string || "";
  const state = data.state as string || "";

  return (
    <>
      <div>
        <FieldLabel required>School Name</FieldLabel>
        <TextField
          value={capitalizeWords(name)}
          onChange={(v) => onChange("name", capitalizeWords(v))}
          placeholder="e.g., Lincoln High School"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>City</FieldLabel>
          <TextField
            value={capitalizeWords(city)}
            onChange={(v) => onChange("city", capitalizeWords(v))}
            placeholder="City"
          />
        </div>
        <div>
          <FieldLabel>State</FieldLabel>
          <SelectField
            value={state}
            onChange={(v) => onChange("state", v)}
            placeholder="Select state"
            options={US_STATES}
          />
        </div>
      </div>
    </>
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

// Types for extracted course data
interface ExtractedCourse {
  name: string;
  subject?: string;
  level?: string;
  gradeLevel?: string;
  grade?: string;
  credits?: number;
  selected?: boolean;  // For user selection in review
}

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
  // Review state - shows extracted courses for confirmation
  const [extractedCourses, setExtractedCourses] = useState<ExtractedCourse[] | null>(null);
  const [extractedGpa, setExtractedGpa] = useState<{ weighted?: number; unweighted?: number } | null>(null);

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
      // Show review screen instead of immediately confirming
      const coursesWithSelection = result.courses.map((c: ExtractedCourse) => ({ ...c, selected: true }));
      setExtractedCourses(coursesWithSelection);
      if (result.gpaUnweighted || result.gpaWeighted) {
        setExtractedGpa({ unweighted: result.gpaUnweighted, weighted: result.gpaWeighted });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process transcript");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleCourse = (index: number) => {
    if (!extractedCourses) return;
    setExtractedCourses(prev =>
      prev?.map((c, i) => i === index ? { ...c, selected: !c.selected } : c) || null
    );
  };

  const updateCourseLevel = (index: number, level: string) => {
    if (!extractedCourses) return;
    setExtractedCourses(prev =>
      prev?.map((c, i) => i === index ? { ...c, level } : c) || null
    );
  };

  const handleConfirmCourses = () => {
    if (!extractedCourses) return;
    const selectedCourses = extractedCourses.filter(c => c.selected);
    onConfirm({
      type: "transcript_extracted",
      courses: selectedCourses,
      count: selectedCourses.length,
    });
  };

  const handleBackToUpload = () => {
    setExtractedCourses(null);
    setExtractedGpa(null);
    setError(null);
  };

  // Review screen - show extracted courses for confirmation
  if (extractedCourses) {
    const selectedCount = extractedCourses.filter(c => c.selected).length;

    return (
      <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-lg">
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-accent-primary" />
            <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
              Review Courses
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white rounded transition-colors text-text-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-lg p-3 mb-3 border border-border-subtle">
          <p className="text-sm text-text-main">
            Found <strong>{extractedCourses.length}</strong> courses
            {extractedGpa?.unweighted && (
              <span className="ml-2 text-text-muted">
                • GPA: {extractedGpa.unweighted.toFixed(2)}
                {extractedGpa.weighted && ` / ${extractedGpa.weighted.toFixed(2)} W`}
              </span>
            )}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Uncheck any courses you don&apos;t want to add. You can also change the course level.
          </p>
        </div>

        {/* Course List */}
        <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
          {extractedCourses.map((course, index) => (
            <div
              key={index}
              className={cn(
                "bg-white rounded-lg p-3 border transition-all",
                course.selected ? "border-accent-primary/50" : "border-border-subtle opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={course.selected}
                  onChange={() => toggleCourse(index)}
                  className="mt-1 rounded border-border-medium"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-text-main truncate">
                      {course.name}
                    </span>
                    {course.grade && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-600 rounded">
                        {course.grade}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={course.level || "regular"}
                      onChange={(e) => updateCourseLevel(index, e.target.value)}
                      className="text-xs bg-bg-sidebar border border-border-medium rounded px-2 py-1"
                    >
                      <option value="regular">Regular</option>
                      <option value="honors">Honors</option>
                      <option value="ap">AP</option>
                      <option value="ib">IB</option>
                      <option value="dual_enrollment">Dual Enrollment</option>
                    </select>
                    {course.gradeLevel && (
                      <span className="text-xs text-text-muted">{course.gradeLevel}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t border-border-subtle">
          <button
            onClick={handleBackToUpload}
            className="px-4 py-2.5 bg-white border border-border-medium rounded-lg text-sm font-medium text-text-muted hover:text-text-main transition-colors"
          >
            Re-upload
          </button>
          <button
            onClick={handleConfirmCourses}
            disabled={selectedCount === 0}
            className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Save {selectedCount} Course{selectedCount !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    );
  }

  // Upload screen
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
// SCHOOL CONFIRM WIDGET - Two-step: 1) Tier selection, 2) Deadline selection
// =============================================================================

interface SchoolDeadline {
  type: string;
  label: string;
  taskType: "milestone" | "action";
  date: string | null;
  alreadyAdded: boolean;
}

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
  const [step, setStep] = useState<"tier" | "deadlines" | "success">("tier");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(true);
  const [availableDeadlines, setAvailableDeadlines] = useState<SchoolDeadline[]>([]);
  const [selectedDeadlines, setSelectedDeadlines] = useState<Set<string>>(new Set());
  const [includeActions, setIncludeActions] = useState(true); // Include action templates by default
  const [actionTemplates, setActionTemplates] = useState<Array<{ title: string; daysOffset: number; category: string }>>([]);
  const [createdTasks, setCreatedTasks] = useState<Array<{ title: string; dueDate: string | null }>>([]);
  const [lookedUpSchool, setLookedUpSchool] = useState<{ id: string; name: string; location?: string } | null>(null);

  const schoolName = (data.name as string) || (data.schoolName as string) || "Unknown School";
  const schoolId = lookedUpSchool?.id || (data.schoolId as string);
  const location = lookedUpSchool?.location || (data.location as string);

  // Look up school by name on mount
  useEffect(() => {
    const lookupSchool = async () => {
      if (data.schoolId) {
        // Already have schoolId, no need to look up
        setIsLookingUp(false);
        return;
      }

      try {
        const response = await fetch(`/api/schools/search?q=${encodeURIComponent(schoolName)}&limit=1`);
        if (response.ok) {
          const result = await response.json();
          if (result.schools && result.schools.length > 0) {
            const school = result.schools[0];
            // Check if it's a close match (case-insensitive)
            if (school.name.toLowerCase() === schoolName.toLowerCase() ||
                school.name.toLowerCase().includes(schoolName.toLowerCase()) ||
                schoolName.toLowerCase().includes(school.name.toLowerCase())) {
              setLookedUpSchool({
                id: school.id,
                name: school.name,
                location: school.city && school.state ? `${school.city}, ${school.state}` : undefined,
              });
              // Update form data with schoolId so it's included when confirming
              onChange("schoolId", school.id);
            }
          }
        }
      } catch (error) {
        console.error("Failed to lookup school:", error);
      } finally {
        setIsLookingUp(false);
      }
    };

    lookupSchool();
  }, [schoolName, data.schoolId, onChange]);

  const hasSchoolIdentifier = !!schoolId || !!(data.name || data.schoolName);
  const canSubmitTier = !!data.tier && hasSchoolIdentifier;
  const isUnknownSchool = !schoolId;

  // Fetch available deadlines when moving to step 2
  const handleTierNext = async () => {
    if (isUnknownSchool) {
      // For unknown schools, skip deadline step and submit directly
      await handleUnknownSchoolSubmit();
      return;
    }

    setIsLoadingDeadlines(true);
    try {
      const response = await fetch(`/api/plan/import-deadlines?type=school&sourceId=${schoolId}`);
      if (response.ok) {
        const result = await response.json();
        setAvailableDeadlines(result.deadlines || []);
        setActionTemplates(result.actionTemplates || []);
        // Pre-select application deadlines based on tier/application type
        const preSelected = new Set<string>();
        for (const d of result.deadlines) {
          if (!d.alreadyAdded && d.date) {
            // Pre-select main deadlines
            if (["early_action", "early_decision", "regular_decision", "financial_aid"].includes(d.type)) {
              preSelected.add(d.type);
            }
          }
        }
        setSelectedDeadlines(preSelected);
      }
    } catch (error) {
      console.error("Failed to fetch deadlines:", error);
    } finally {
      setIsLoadingDeadlines(false);
    }
    setStep("deadlines");
  };

  const handleUnknownSchoolSubmit = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/data-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "school",
          name: schoolName,
          details: { tier: data.tier, location },
        }),
      });
      onConfirm();
      setStep("success");
    } catch (error) {
      console.error("Error submitting request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDeadline = (type: string) => {
    setSelectedDeadlines(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // First, add school to list
      onConfirm();

      // Then, import selected deadlines to plan
      const deadlinesToImport = Array.from(selectedDeadlines);
      if (includeActions) {
        deadlinesToImport.push("include_actions");
      }

      if (deadlinesToImport.length > 0 && schoolId) {
        const response = await fetch("/api/plan/import-deadlines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "school",
            sourceId: schoolId,
            deadlines: deadlinesToImport,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setCreatedTasks(result.tasks || []);
        }
      }

      setStep("success");
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (step === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm font-bold text-green-700">Added to Your List!</span>
        </div>
        <p className="text-sm text-green-700 mb-2">
          <strong>{schoolName}</strong> has been added to your school list.
        </p>
        {createdTasks.length > 0 && (
          <p className="text-xs text-green-600 mb-3">
            {createdTasks.length} deadline{createdTasks.length !== 1 ? "s" : ""} added to your plan.
          </p>
        )}
        <button
          onClick={onDismiss}
          className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Got it
        </button>
      </div>
    );
  }

  // Step 2: Deadline selection
  if (step === "deadlines") {
    const selectableDeadlines = availableDeadlines.filter(d => d.date && !d.alreadyAdded);

    return (
      <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-accent-primary" />
            <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
              Track Deadlines
            </span>
          </div>
          <button onClick={onDismiss} className="p-1 hover:bg-white rounded transition-colors text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-lg p-3 mb-3 border border-border-subtle">
          <p className="text-sm text-text-main">
            Add <strong>{schoolName}</strong> deadlines to your plan?
          </p>
          <p className="text-xs text-text-muted mt-1">
            Select which deadlines to track. They&apos;ll appear in your timeline.
          </p>
        </div>

        {isLoadingDeadlines ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {/* Milestones/Deadlines */}
            {selectableDeadlines.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Milestones & Deadlines
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectableDeadlines.map(deadline => (
                    <label
                      key={deadline.type}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                        selectedDeadlines.has(deadline.type)
                          ? "border-accent-primary bg-accent-surface/50"
                          : "border-border-subtle bg-white hover:border-accent-primary/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDeadlines.has(deadline.type)}
                        onChange={() => toggleDeadline(deadline.type)}
                        className="rounded border-border-medium"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-main">{deadline.label}</span>
                          {deadline.taskType === "milestone" && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Info</span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted">
                          {deadline.date ? new Date(deadline.date).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric"
                          }) : "Date TBD"}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Action Tasks Toggle */}
            {actionTemplates.length > 0 && (
              <div>
                <label
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    includeActions
                      ? "border-green-500 bg-green-50/50"
                      : "border-border-subtle bg-white hover:border-green-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={includeActions}
                    onChange={(e) => setIncludeActions(e.target.checked)}
                    className="mt-0.5 rounded border-border-medium"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-main">Add recommended tasks</div>
                    <div className="text-xs text-text-muted mt-1">
                      {actionTemplates.map(t => t.title).join(", ")}
                    </div>
                  </div>
                </label>
              </div>
            )}

            {selectableDeadlines.length === 0 && actionTemplates.length === 0 && (
              <div className="text-center py-4 text-sm text-text-muted">
                No deadline dates available for this school yet.
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-border-subtle">
          <button
            onClick={() => setStep("tier")}
            className="px-4 py-2.5 bg-white border border-border-medium rounded-lg text-sm font-medium text-text-muted hover:text-text-main transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {selectedDeadlines.size > 0
              ? `Add School & ${selectedDeadlines.size} Deadline${selectedDeadlines.size !== 1 ? "s" : ""}`
              : "Add School Only"}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Tier selection (default)
  return (
    <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <School className="w-5 h-5 text-accent-primary" />
          <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
            Add to List
          </span>
        </div>
        <button onClick={onDismiss} className="p-1 hover:bg-white rounded transition-colors text-text-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-lg p-3 mb-3 border border-border-subtle">
        <div className="font-semibold text-text-main">
          {lookedUpSchool?.name || schoolName}
        </div>
        {location && <div className="text-xs text-text-muted mt-0.5">{location}</div>}
        {isLookingUp ? (
          <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            Looking up school...
          </div>
        ) : isUnknownSchool ? (
          <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">
            Not in database
          </span>
        ) : (
          <span className="inline-block mt-2 text-[10px] px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
            Found in database
          </span>
        )}
      </div>

      {!isLookingUp && isUnknownSchool && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs text-amber-700">
          We don&apos;t have this school in our database yet. We&apos;ll add it to your list and send a request to add it with full admission data.
        </div>
      )}

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

      <div className="flex gap-2">
        <button
          onClick={handleTierNext}
          disabled={!canSubmitTier || isSubmitting || isLookingUp}
          className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting || isLookingUp ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isUnknownSchool ? (
            <>
              <Check className="w-4 h-4" />
              Add & Request
            </>
          ) : (
            "Next: Track Deadlines"
          )}
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
// PROGRAM CONFIRM WIDGET - Two-step: 1) Status selection, 2) Deadline selection
// =============================================================================

interface ProgramDeadline {
  type: string;
  label: string;
  taskType: "milestone" | "action";
  date: string | null;
  alreadyAdded: boolean;
}

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
  const [step, setStep] = useState<"status" | "deadlines" | "success">("status");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(false);
  const [availableDeadlines, setAvailableDeadlines] = useState<ProgramDeadline[]>([]);
  const [selectedDeadlines, setSelectedDeadlines] = useState<Set<string>>(new Set());
  const [includeActions, setIncludeActions] = useState(true);
  const [actionTemplates, setActionTemplates] = useState<Array<{ title: string; daysOffset: number; category: string }>>([]);
  const [createdTasks, setCreatedTasks] = useState<Array<{ title: string; dueDate: string | null }>>([]);

  const programName = (data.name as string) || "Unknown Program";
  const organization = data.organization as string;
  const programId = data.programId as string;
  const type = data.type as string;
  const selectivity = data.selectivity as string;

  const isUnknownProgram = !programId;
  const canSubmitStatus = !!data.status;

  const handleStatusNext = async () => {
    if (isUnknownProgram) {
      await handleUnknownProgramSubmit();
      return;
    }

    setIsLoadingDeadlines(true);
    try {
      const response = await fetch(`/api/plan/import-deadlines?type=program&sourceId=${programId}`);
      if (response.ok) {
        const result = await response.json();
        setAvailableDeadlines(result.deadlines || []);
        setActionTemplates(result.actionTemplates || []);
        // Pre-select application deadlines
        const preSelected = new Set<string>();
        for (const d of result.deadlines) {
          if (!d.alreadyAdded && d.date) {
            if (["application_deadline", "early_deadline", "notification"].includes(d.type)) {
              preSelected.add(d.type);
            }
          }
        }
        setSelectedDeadlines(preSelected);
      }
    } catch (error) {
      console.error("Failed to fetch deadlines:", error);
    } finally {
      setIsLoadingDeadlines(false);
    }
    setStep("deadlines");
  };

  const handleUnknownProgramSubmit = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/data-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "program",
          name: programName,
          organization,
          details: { year: data.year, userStatus: data.status },
        }),
      });
      onConfirm();
      setStep("success");
    } catch (error) {
      console.error("Error submitting request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDeadline = (type: string) => {
    setSelectedDeadlines(prev => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      onConfirm();

      const deadlinesToImport = Array.from(selectedDeadlines);
      if (includeActions) {
        deadlinesToImport.push("include_actions");
      }

      if (deadlinesToImport.length > 0 && programId) {
        const response = await fetch("/api/plan/import-deadlines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "program",
            sourceId: programId,
            deadlines: deadlinesToImport,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          setCreatedTasks(result.tasks || []);
        }
      }

      setStep("success");
    } catch (error) {
      console.error("Error submitting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (step === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-sm font-bold text-green-700">Added to Your Profile!</span>
        </div>
        <p className="text-sm text-green-700 mb-2">
          <strong>{programName}</strong> has been added to your programs.
        </p>
        {createdTasks.length > 0 && (
          <p className="text-xs text-green-600 mb-3">
            {createdTasks.length} item{createdTasks.length !== 1 ? "s" : ""} added to your plan.
          </p>
        )}
        <button
          onClick={onDismiss}
          className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          Got it
        </button>
      </div>
    );
  }

  // Step 2: Deadline selection
  if (step === "deadlines") {
    const selectableDeadlines = availableDeadlines.filter(d => d.date && !d.alreadyAdded);

    return (
      <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-accent-primary" />
            <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
              Track Deadlines
            </span>
          </div>
          <button onClick={onDismiss} className="p-1 hover:bg-white rounded transition-colors text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white rounded-lg p-3 mb-3 border border-border-subtle">
          <p className="text-sm text-text-main">
            Add <strong>{programName}</strong> dates to your plan?
          </p>
          <p className="text-xs text-text-muted mt-1">
            Select which dates to track. They&apos;ll appear in your timeline.
          </p>
        </div>

        {isLoadingDeadlines ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 text-accent-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 mb-4">
            {/* Milestones/Deadlines */}
            {selectableDeadlines.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                  Milestones & Deadlines
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectableDeadlines.map(deadline => (
                    <label
                      key={deadline.type}
                      className={cn(
                        "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                        selectedDeadlines.has(deadline.type)
                          ? "border-accent-primary bg-accent-surface/50"
                          : "border-border-subtle bg-white hover:border-accent-primary/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDeadlines.has(deadline.type)}
                        onChange={() => toggleDeadline(deadline.type)}
                        className="rounded border-border-medium"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-main">{deadline.label}</span>
                          {deadline.taskType === "milestone" && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Info</span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted">
                          {deadline.date ? new Date(deadline.date).toLocaleDateString("en-US", {
                            month: "short", day: "numeric", year: "numeric"
                          }) : "Date TBD"}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Action Tasks Toggle */}
            {actionTemplates.length > 0 && (
              <div>
                <label
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    includeActions
                      ? "border-green-500 bg-green-50/50"
                      : "border-border-subtle bg-white hover:border-green-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={includeActions}
                    onChange={(e) => setIncludeActions(e.target.checked)}
                    className="mt-0.5 rounded border-border-medium"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-main">Add recommended tasks</div>
                    <div className="text-xs text-text-muted mt-1">
                      {actionTemplates.map(t => t.title).join(", ")}
                    </div>
                  </div>
                </label>
              </div>
            )}

            {selectableDeadlines.length === 0 && actionTemplates.length === 0 && (
              <div className="text-center py-4 text-sm text-text-muted">
                No dates available for this program yet.
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-border-subtle">
          <button
            onClick={() => setStep("status")}
            className="px-4 py-2.5 bg-white border border-border-medium rounded-lg text-sm font-medium text-text-muted hover:text-text-main transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {selectedDeadlines.size > 0
              ? `Add Program & ${selectedDeadlines.size} Date${selectedDeadlines.size !== 1 ? "s" : ""}`
              : "Add Program Only"}
          </button>
        </div>
      </div>
    );
  }

  // Step 1: Status selection (default)
  return (
    <div className="bg-accent-surface/50 border border-accent-border rounded-xl p-4 mt-3 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full max-w-sm">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-accent-primary" />
          <span className="text-sm font-bold text-accent-primary uppercase tracking-wider">
            Add Program
          </span>
        </div>
        <button onClick={onDismiss} className="p-1 hover:bg-white rounded transition-colors text-text-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white rounded-lg p-3 mb-3 border border-border-subtle">
        <div className="font-semibold text-text-main">{programName}</div>
        {organization && <div className="text-xs text-text-muted mt-0.5">{organization}</div>}
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
          {isUnknownProgram && (
            <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full">
              Not in database
            </span>
          )}
        </div>
      </div>

      {isUnknownProgram && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-3 text-xs text-amber-700">
          We don&apos;t have this program in our database yet. We&apos;ll add it to your profile and send a request to add it to our curated list.
        </div>
      )}

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

      <div className="flex gap-2">
        <button
          onClick={handleStatusNext}
          disabled={!canSubmitStatus || isSubmitting}
          className="flex-1 bg-accent-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isUnknownProgram ? (
            <>
              <Check className="w-4 h-4" />
              Add & Request
            </>
          ) : (
            "Next: Track Dates"
          )}
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
