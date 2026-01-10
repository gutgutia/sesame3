"use client";

import React, { useState } from "react";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

const STATUS_OPTIONS = [
  { value: "", label: "Select status..." },
  { value: "interested", label: "Interested" },
  { value: "researching", label: "Researching" },
  { value: "preparing", label: "Preparing Application" },
  { value: "applying", label: "Applying" },
  { value: "applied", label: "Applied" },
  { value: "accepted", label: "Accepted" },
  { value: "attending", label: "Attending" },
  { value: "completed", label: "Completed" },
  { value: "rejected", label: "Rejected" },
  { value: "waitlisted", label: "Waitlisted" },
  { value: "declined", label: "Declined Offer" },
];

interface ProgramFormProps {
  initialData?: {
    id?: string;
    name?: string | null;
    organization?: string | null;
    status?: string | null;
    year?: number | null;
    description?: string | null;
    notes?: string | null;
    whyInterested?: string | null;
  };
  onSubmit: (data: {
    name: string;
    organization?: string;
    status?: string;
    year?: number;
    description?: string;
    notes?: string;
    whyInterested?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function ProgramForm({ initialData, onSubmit, onCancel }: ProgramFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [organization, setOrganization] = useState(initialData?.organization || "");
  const [status, setStatus] = useState(initialData?.status || "interested");
  const [year, setYear] = useState(initialData?.year?.toString() || new Date().getFullYear().toString());
  const [description, setDescription] = useState(initialData?.description || "");
  const [whyInterested, setWhyInterested] = useState(initialData?.whyInterested || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        name: name.trim(),
        organization: organization.trim() || undefined,
        status: status || undefined,
        year: year ? parseInt(year) : undefined,
        description: description.trim() || undefined,
        whyInterested: whyInterested.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [
    { value: "", label: "Select year..." },
    { value: (currentYear + 1).toString(), label: (currentYear + 1).toString() },
    ...Array.from({ length: 4 }, (_, i) => ({
      value: (currentYear - i).toString(),
      label: (currentYear - i).toString(),
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Program Name"
        placeholder="e.g., Stanford SIMR, RSI, MOSTEC"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <Input
        label="Organization / Institution"
        placeholder="e.g., Stanford University, MIT"
        value={organization}
        onChange={(e) => setOrganization(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="Year"
          options={yearOptions}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>

      <Textarea
        label="Why are you interested?"
        placeholder="What draws you to this program?"
        value={whyInterested}
        onChange={(e) => setWhyInterested(e.target.value)}
        rows={2}
      />

      <Textarea
        label="Description / Notes (optional)"
        placeholder="What did you do? What did you learn?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
        <Link
          href="/advisor?mode=profile&q=help me find summer programs"
          className="flex items-center gap-1.5 text-sm text-text-muted hover:text-accent-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Find programs for me</span>
        </Link>

        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? "Saving..." : initialData?.id ? "Update" : "Add Program"}
          </Button>
        </div>
      </div>
    </form>
  );
}
