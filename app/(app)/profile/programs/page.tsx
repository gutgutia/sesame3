"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FlaskConical,
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { ProgramForm } from "@/components/profile";

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  attending: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-800",
  applying: "bg-accent-surface text-accent-primary",
  interested: "bg-gray-100 text-gray-600",
  waitlisted: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-600",
};

export default function ProgramsPage() {
  const { profile, isLoading, error, refreshProfile } = useProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Record<string, unknown> | null>(null);

  const programs = profile?.programs || [];

  // Group by year
  const programsByYear = programs.reduce((acc, program) => {
    const year = program.year?.toString() || "Other";
    if (!acc[year]) acc[year] = [];
    acc[year].push(program);
    return acc;
  }, {} as Record<string, typeof programs>);

  const sortedYears = Object.keys(programsByYear).sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return parseInt(b) - parseInt(a);
  });

  const handleSaveProgram = async (data: Record<string, unknown>) => {
    const isEdit = !!editingProgram?.id;
    const response = await fetch(
      isEdit ? `/api/profile/programs/${editingProgram.id}` : "/api/profile/programs",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (response.ok) {
      await refreshProfile();
      setIsModalOpen(false);
      setEditingProgram(null);
    }
  };

  const handleDeleteProgram = async (id: string) => {
    await fetch(`/api/profile/programs/${id}`, { method: "DELETE" });
    refreshProfile();
  };

  const openAddModal = () => {
    setEditingProgram(null);
    setIsModalOpen(true);
  };

  const openEditModal = (program: Record<string, unknown>) => {
    setEditingProgram(program);
    setIsModalOpen(true);
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
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-text-main">Programs</h1>
              <p className="text-text-muted">Summer programs, research, and internships</p>
            </div>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Program
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {programs.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-[20px] p-12 text-center shadow-card">
          <FlaskConical className="w-12 h-12 text-text-light mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-text-main mb-2">No programs yet</h3>
          <p className="text-text-muted mb-6">Add summer programs, research experiences, or internships</p>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Your First Program
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedYears.map(year => (
            <div key={year}>
              <h3 className="font-display font-bold text-text-main mb-3 flex items-center gap-2">
                {year === "Other" ? "Other Programs" : year}
                <span className="text-sm font-normal text-text-muted">
                  ({programsByYear[year].length})
                </span>
              </h3>
              <div className="grid gap-4">
                {programsByYear[year].map((program) => (
                  <div 
                    key={program.id}
                    className="bg-white border border-border-subtle rounded-[16px] p-5 shadow-card group hover:border-accent-border transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-display font-bold text-lg text-text-main">
                            {program.name}
                          </span>
                          {program.status && (
                            <span className={cn(
                              "text-[10px] font-bold uppercase px-2 py-0.5 rounded capitalize",
                              STATUS_STYLES[program.status] || "bg-gray-100 text-gray-600"
                            )}>
                              {program.status}
                            </span>
                          )}
                        </div>
                        
                        {program.organization && (
                          <div className="text-text-muted mb-1">{program.organization}</div>
                        )}
                        
                        {program.summerProgram?.category && (
                          <div className="text-sm text-text-muted capitalize">
                            {program.summerProgram.category.replace("_", " ")}
                          </div>
                        )}

                        {(program.description || program.whyInterested) && (
                          <p className="mt-3 text-sm text-text-main line-clamp-2">
                            {program.whyInterested || program.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(program)}
                          className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteProgram(program.id)}
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
        onClose={() => { setIsModalOpen(false); setEditingProgram(null); }}
        title={editingProgram ? "Edit Program" : "Add Program"}
        description="Add summer programs, research, or internships"
      >
        <ProgramForm
          initialData={editingProgram || undefined}
          onSubmit={handleSaveProgram}
          onCancel={() => { setIsModalOpen(false); setEditingProgram(null); }}
        />
      </Modal>
    </>
  );
}

