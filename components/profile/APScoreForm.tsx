"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// Common AP subjects for dropdown
const AP_SUBJECTS = [
  // STEM
  "AP Biology",
  "AP Chemistry",
  "AP Physics 1",
  "AP Physics 2",
  "AP Physics C: Mechanics",
  "AP Physics C: Electricity & Magnetism",
  "AP Environmental Science",
  "AP Computer Science A",
  "AP Computer Science Principles",
  "AP Calculus AB",
  "AP Calculus BC",
  "AP Statistics",
  "AP Precalculus",
  // Humanities
  "AP English Language & Composition",
  "AP English Literature & Composition",
  "AP U.S. History",
  "AP World History: Modern",
  "AP European History",
  "AP U.S. Government & Politics",
  "AP Comparative Government & Politics",
  "AP Human Geography",
  "AP Macroeconomics",
  "AP Microeconomics",
  "AP Psychology",
  // Arts
  "AP Art History",
  "AP Music Theory",
  "AP 2-D Art and Design",
  "AP 3-D Art and Design",
  "AP Drawing",
  // Languages
  "AP Spanish Language & Culture",
  "AP Spanish Literature & Culture",
  "AP French Language & Culture",
  "AP German Language & Culture",
  "AP Italian Language & Culture",
  "AP Japanese Language & Culture",
  "AP Chinese Language & Culture",
  "AP Latin",
  // Research
  "AP Research",
  "AP Seminar",
];

interface APScoreFormProps {
  initialData?: {
    id?: string;
    subject?: string;
    score?: number;
    year?: number;
  };
  onSubmit: (data: {
    subject: string;
    score: number;
    year: number;
  }) => Promise<void>;
  onCancel: () => void;
}

export function APScoreForm({ initialData, onSubmit, onCancel }: APScoreFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [customSubject, setCustomSubject] = useState("");
  const [score, setScore] = useState(initialData?.score?.toString() || "");
  const [year, setYear] = useState(
    initialData?.year?.toString() || new Date().getFullYear().toString()
  );

  const isCustomSubject = subject === "other";
  const finalSubject = isCustomSubject ? customSubject : subject;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalSubject || !score) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        subject: finalSubject,
        score: parseInt(score),
        year: parseInt(year),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate year options (current year back to 5 years ago)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-text-main mb-1.5">
          AP Subject
        </label>
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-white border border-border-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface transition-all"
          required
        >
          <option value="">Select a subject...</option>
          {AP_SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value="other">Other (type your own)</option>
        </select>
      </div>

      {/* Custom Subject Input */}
      {isCustomSubject && (
        <Input
          label="Subject Name"
          placeholder="e.g., AP African American Studies"
          value={customSubject}
          onChange={(e) => setCustomSubject(e.target.value)}
          required
        />
      )}

      {/* Score and Year */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-text-main mb-1.5">
            Score
          </label>
          <select
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full bg-white border border-border-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface transition-all"
            required
          >
            <option value="">Select...</option>
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-main mb-1.5">
            Year Taken
          </label>
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full bg-white border border-border-medium rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface transition-all"
            required
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Score Display */}
      {score && (
        <div className="rounded-xl p-4 text-center bg-accent-surface/50">
          <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Score</div>
          <div className="text-3xl font-mono font-bold text-accent-primary">{score}</div>
          <div className="text-xs text-text-muted mt-1">
            {parseInt(score) >= 4 ? "College credit likely" : parseInt(score) === 3 ? "May qualify for credit" : "No credit typically awarded"}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !finalSubject || !score}>
          {isSubmitting ? "Saving..." : initialData?.id ? "Update" : "Add Score"}
        </Button>
      </div>
    </form>
  );
}
