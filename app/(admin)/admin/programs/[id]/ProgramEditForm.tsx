"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Sparkles,
  Trash2,
  Plus,
  Calendar,
  GraduationCap,
  FileText,
  MapPin,
  Info,
} from "lucide-react";

interface ProgramSession {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
}

interface Program {
  id: string;
  name: string;
  shortName: string | null;
  organization: string;
  description: string | null;
  websiteUrl: string | null;
  programYear: number;
  // Eligibility
  minGrade: number | null;
  maxGrade: number | null;
  minAge: number | null;
  maxAge: number | null;
  minGpaUnweighted: number | null;
  minGpaWeighted: number | null;
  citizenship: string | null;
  requiredCourses: string[];
  recommendedCourses: string[];
  eligibilityNotes: string | null;
  // Application
  applicationOpens: Date | null;
  applicationDeadline: Date | null;
  isRolling: boolean;
  rollingNotes: string | null;
  applicationUrl: string | null;
  applicationNotes: string | null;
  // Program Details
  format: string | null;
  location: string | null;
  // AI Context
  llmContext: string | null;
  // Metadata
  category: string | null;
  focusAreas: string[];
  isActive: boolean;
  dataSource: string | null;
  dataStatus: string | null;
  // Sessions
  sessions: ProgramSession[];
}

interface ProgramEditFormProps {
  program: Program;
}

type SessionState = {
  id: string | null;
  name: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export function ProgramEditForm({ program }: ProgramEditFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isRunningLlm, setIsRunningLlm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: program.name,
    shortName: program.shortName || "",
    organization: program.organization,
    description: program.description || "",
    websiteUrl: program.websiteUrl || "",
    programYear: program.programYear,
    // Eligibility
    minGrade: program.minGrade?.toString() || "",
    maxGrade: program.maxGrade?.toString() || "",
    minAge: program.minAge?.toString() || "",
    maxAge: program.maxAge?.toString() || "",
    minGpaUnweighted: program.minGpaUnweighted?.toString() || "",
    minGpaWeighted: program.minGpaWeighted?.toString() || "",
    citizenship: program.citizenship || "",
    requiredCourses: program.requiredCourses.join(", "),
    recommendedCourses: program.recommendedCourses.join(", "),
    eligibilityNotes: program.eligibilityNotes || "",
    // Application
    applicationOpens: formatDateForInput(program.applicationOpens),
    applicationDeadline: formatDateForInput(program.applicationDeadline),
    isRolling: program.isRolling,
    rollingNotes: program.rollingNotes || "",
    applicationUrl: program.applicationUrl || "",
    applicationNotes: program.applicationNotes || "",
    // Program Details
    format: program.format || "",
    location: program.location || "",
    // AI Context
    llmContext: program.llmContext || "",
    // Metadata
    category: program.category || "",
    focusAreas: program.focusAreas.join(", "),
    isActive: program.isActive,
    dataSource: program.dataSource || "manual",
    dataStatus: program.dataStatus || "pending_review",
  });

  // Sessions state
  const [sessions, setSessions] = useState<SessionState[]>(
    program.sessions.map((s) => ({
      id: s.id,
      name: s.name,
      startDate: formatDateForInput(s.startDate),
      endDate: formatDateForInput(s.endDate),
      notes: s.notes || "",
    }))
  );

  function formatDateForInput(date: Date | null | undefined): string {
    if (!date) return "";
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  }

  const handleChange = (field: string, value: string | boolean | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSessionChange = (index: number, field: keyof SessionState, value: string) => {
    setSessions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
    setSuccess(false);
  };

  const addSession = () => {
    setSessions((prev) => [
      ...prev,
      {
        id: null,
        name: `Session ${prev.length + 1}`,
        startDate: "",
        endDate: "",
        notes: "",
      },
    ]);
  };

  const removeSession = (index: number) => {
    setSessions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/programs/${program.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          shortName: formData.shortName || null,
          organization: formData.organization,
          description: formData.description || null,
          websiteUrl: formData.websiteUrl || null,
          programYear: formData.programYear,
          // Eligibility
          minGrade: formData.minGrade ? parseInt(formData.minGrade) : null,
          maxGrade: formData.maxGrade ? parseInt(formData.maxGrade) : null,
          minAge: formData.minAge ? parseInt(formData.minAge) : null,
          maxAge: formData.maxAge ? parseInt(formData.maxAge) : null,
          minGpaUnweighted: formData.minGpaUnweighted ? parseFloat(formData.minGpaUnweighted) : null,
          minGpaWeighted: formData.minGpaWeighted ? parseFloat(formData.minGpaWeighted) : null,
          citizenship: formData.citizenship || null,
          requiredCourses: formData.requiredCourses
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          recommendedCourses: formData.recommendedCourses
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          eligibilityNotes: formData.eligibilityNotes || null,
          // Application
          applicationOpens: formData.applicationOpens || null,
          applicationDeadline: formData.applicationDeadline || null,
          isRolling: formData.isRolling,
          rollingNotes: formData.rollingNotes || null,
          applicationUrl: formData.applicationUrl || null,
          applicationNotes: formData.applicationNotes || null,
          // Program Details
          format: formData.format || null,
          location: formData.location || null,
          // AI Context
          llmContext: formData.llmContext || null,
          // Metadata
          category: formData.category || null,
          focusAreas: formData.focusAreas
            .split(",")
            .map((f) => f.trim())
            .filter(Boolean),
          isActive: formData.isActive,
          dataSource: formData.dataSource,
          dataStatus: formData.dataStatus,
          // Sessions
          sessions: sessions.map((s) => ({
            id: s.id,
            name: s.name,
            startDate: s.startDate || null,
            endDate: s.endDate || null,
            notes: s.notes || null,
          })),
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunLlm = async () => {
    setIsRunningLlm(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/llm/scrape-program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: program.id,
          name: program.name,
          organization: program.organization,
          websiteUrl: formData.websiteUrl,
        }),
      });

      if (!res.ok) throw new Error("LLM scraping failed");

      const data = await res.json();

      // Update form with LLM results
      if (data.program) {
        const updates: Partial<typeof formData> = {};

        if (data.program.applicationDeadline) {
          updates.applicationDeadline = data.program.applicationDeadline;
        }
        if (data.program.applicationOpens) {
          updates.applicationOpens = data.program.applicationOpens;
        }
        if (data.program.eligibilityNotes) {
          updates.eligibilityNotes = data.program.eligibilityNotes;
        }
        if (data.program.applicationNotes) {
          updates.applicationNotes = data.program.applicationNotes;
        }
        if (data.program.minGrade) {
          updates.minGrade = data.program.minGrade.toString();
        }
        if (data.program.maxGrade) {
          updates.maxGrade = data.program.maxGrade.toString();
        }
        if (data.program.minAge) {
          updates.minAge = data.program.minAge.toString();
        }
        if (data.program.format) {
          updates.format = data.program.format;
        }
        if (data.program.location) {
          updates.location = data.program.location;
        }

        setFormData((prev) => ({
          ...prev,
          ...updates,
          dataSource: "llm_scraped",
        }));

        // Update sessions if provided
        if (data.program.sessions && data.program.sessions.length > 0) {
          setSessions(
            data.program.sessions.map((s: { name: string; startDate: string; endDate: string }) => ({
              id: null,
              name: s.name,
              startDate: s.startDate || "",
              endDate: s.endDate || "",
              notes: "",
            }))
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "LLM scraping failed");
    } finally {
      setIsRunningLlm(false);
    }
  };

  const categories = [
    "STEM",
    "research",
    "arts",
    "leadership",
    "business",
    "humanities",
    "medicine",
    "engineering",
    "law",
    "social_sciences",
  ];

  const formats = [
    { value: "residential", label: "Residential" },
    { value: "commuter", label: "Commuter" },
    { value: "online", label: "Online" },
    { value: "hybrid", label: "Hybrid" },
  ];

  const citizenshipOptions = [
    { value: "", label: "Not specified" },
    { value: "us_only", label: "US Citizens Only" },
    { value: "us_permanent_resident", label: "US Citizens & Permanent Residents" },
    { value: "international_ok", label: "International Students Welcome" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back Link */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Programs
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{program.name}</h1>
          <p className="text-gray-500">
            {program.organization}
            {program.location && ` - ${program.location}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              formData.isActive
                ? "bg-green-50 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {formData.isActive ? "Active" : "Inactive"}
          </span>
          <span
            className={`px-2 py-1 text-xs rounded-full ${
              formData.dataStatus === "verified"
                ? "bg-blue-50 text-blue-700"
                : formData.dataStatus === "needs_update"
                ? "bg-amber-50 text-amber-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {formData.dataStatus === "verified"
              ? "Verified"
              : formData.dataStatus === "needs_update"
              ? "Needs Update"
              : "Pending Review"}
          </span>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-lg mb-4">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Short Name
            </label>
            <input
              type="text"
              value={formData.shortName}
              onChange={(e) => handleChange("shortName", e.target.value)}
              placeholder="e.g., SIMR, RSI"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization
            </label>
            <input
              type="text"
              value={formData.organization}
              onChange={(e) => handleChange("organization", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={formData.websiteUrl}
              onChange={(e) => handleChange("websiteUrl", e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Year
            </label>
            <input
              type="number"
              value={formData.programYear}
              onChange={(e) => handleChange("programYear", parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>
      </div>

      {/* Eligibility */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg">Eligibility Requirements</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          These fields are used for fast filtering. Complex rules go in Eligibility Notes.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Grade
            </label>
            <select
              value={formData.minGrade}
              onChange={(e) => handleChange("minGrade", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="">Not specified</option>
              {[9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Grade
            </label>
            <select
              value={formData.maxGrade}
              onChange={(e) => handleChange("maxGrade", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="">Not specified</option>
              {[9, 10, 11, 12].map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Age
            </label>
            <input
              type="number"
              value={formData.minAge}
              onChange={(e) => handleChange("minAge", e.target.value)}
              placeholder="e.g., 14"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Age
            </label>
            <input
              type="number"
              value={formData.maxAge}
              onChange={(e) => handleChange("maxAge", e.target.value)}
              placeholder="e.g., 18"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min GPA (Unweighted)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.minGpaUnweighted}
              onChange={(e) => handleChange("minGpaUnweighted", e.target.value)}
              placeholder="e.g., 3.5"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min GPA (Weighted)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.minGpaWeighted}
              onChange={(e) => handleChange("minGpaWeighted", e.target.value)}
              placeholder="e.g., 4.0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Citizenship
            </label>
            <select
              value={formData.citizenship}
              onChange={(e) => handleChange("citizenship", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              {citizenshipOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Required Courses
            </label>
            <input
              type="text"
              value={formData.requiredCourses}
              onChange={(e) => handleChange("requiredCourses", e.target.value)}
              placeholder="Comma-separated, e.g., AP Calculus, Chemistry"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommended Courses
            </label>
            <input
              type="text"
              value={formData.recommendedCourses}
              onChange={(e) => handleChange("recommendedCourses", e.target.value)}
              placeholder="Comma-separated"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Eligibility Notes
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Complex eligibility rules the system can&apos;t auto-check (e.g., &quot;Must turn 16 by December 31&quot;, &quot;First-generation only&quot;)
          </p>
          <textarea
            value={formData.eligibilityNotes}
            onChange={(e) => handleChange("eligibilityNotes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
      </div>

      {/* Application */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <h2 className="font-bold text-lg">Application</h2>
          </div>
          <button
            type="button"
            onClick={handleRunLlm}
            disabled={isRunningLlm}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 disabled:opacity-50"
          >
            {isRunningLlm ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Auto-fill with AI
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application Opens
            </label>
            <input
              type="date"
              value={formData.applicationOpens}
              onChange={(e) => handleChange("applicationOpens", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application Deadline
            </label>
            <input
              type="date"
              value={formData.applicationDeadline}
              onChange={(e) => handleChange("applicationDeadline", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Application URL
            </label>
            <input
              type="url"
              value={formData.applicationUrl}
              onChange={(e) => handleChange("applicationUrl", e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isRolling}
              onChange={(e) => handleChange("isRolling", e.target.checked)}
              className="rounded border-gray-300 text-slate-900 focus:ring-slate-900"
            />
            <span className="text-sm font-medium text-gray-700">Rolling Admissions</span>
          </label>
          {formData.isRolling && (
            <input
              type="text"
              value={formData.rollingNotes}
              onChange={(e) => handleChange("rollingNotes", e.target.value)}
              placeholder="e.g., Until filled, Rolling through March 1"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Application Requirements Notes
          </label>
          <p className="text-xs text-gray-500 mb-2">
            e.g., &quot;Requires 2 teacher recommendations, transcript, and 500-word essay&quot;
          </p>
          <textarea
            value={formData.applicationNotes}
            onChange={(e) => handleChange("applicationNotes", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>
      </div>

      {/* Program Details & Sessions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg">Program Details</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select
              value={formData.format}
              onChange={(e) => handleChange("format", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="">Not specified</option>
              {formats.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange("location", e.target.value)}
              placeholder="e.g., Stanford, CA"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </div>

        {/* Sessions */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Sessions</h3>
            <button
              type="button"
              onClick={addSession}
              className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
            >
              <Plus className="w-4 h-4" />
              Add Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No sessions added. Click &quot;Add Session&quot; to add program dates.
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={session.name}
                        onChange={(e) =>
                          handleSessionChange(index, "name", e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={session.startDate}
                        onChange={(e) =>
                          handleSessionChange(index, "startDate", e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={session.endDate}
                        onChange={(e) =>
                          handleSessionChange(index, "endDate", e.target.value)
                        }
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Notes
                      </label>
                      <input
                        type="text"
                        value={session.notes}
                        onChange={(e) =>
                          handleSessionChange(index, "notes", e.target.value)
                        }
                        placeholder="Optional"
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSession(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI Context */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-2 mb-2">
          <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
          <div>
            <h2 className="font-bold text-lg">AI Context</h2>
            <p className="text-sm text-gray-500">
              Freeform context for the AI advisor (tracks, tips, notable alumni, etc.)
            </p>
          </div>
        </div>
        <textarea
          value={formData.llmContext}
          onChange={(e) => handleChange("llmContext", e.target.value)}
          placeholder="e.g., Offers Business, Architecture, and Engineering tracks. Business track is best for students interested in entrepreneurship. Known for strong networking opportunities."
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      {/* Classification & Metadata */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-gray-400" />
          <h2 className="font-bold text-lg">Classification & Metadata</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="">Not specified</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1).replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Source
            </label>
            <select
              value={formData.dataSource}
              onChange={(e) => handleChange("dataSource", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="manual">Manual</option>
              <option value="website">Website</option>
              <option value="llm_scraped">AI Scraped</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.dataStatus}
              onChange={(e) => handleChange("dataStatus", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="pending_review">Pending Review</option>
              <option value="verified">Verified</option>
              <option value="needs_update">Needs Update</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Focus Areas
          </label>
          <input
            type="text"
            value={formData.focusAreas}
            onChange={(e) => handleChange("focusAreas", e.target.value)}
            placeholder="Comma-separated, e.g., STEM, research, medicine"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
            className="rounded border-gray-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="text-sm font-medium text-gray-700">Program is Active</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>

        {success && (
          <span className="text-sm text-green-600">Changes saved successfully!</span>
        )}

        {error && <span className="text-sm text-red-600">{error}</span>}

        <div className="flex-1" />

        {formData.websiteUrl && (
          <a
            href={formData.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
          >
            <ExternalLink className="w-4 h-4" />
            Visit Website
          </a>
        )}
      </div>
    </form>
  );
}
