"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Trophy, 
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { AwardForm } from "@/components/profile";

const LEVEL_STYLES: Record<string, string> = {
  international: "bg-purple-100 text-purple-700",
  national: "bg-red-100 text-red-700",
  state: "bg-blue-100 text-blue-700",
  regional: "bg-green-100 text-green-700",
  school: "bg-gray-100 text-gray-700",
};

export default function AwardsPage() {
  const { profile, isLoading, error, refreshProfile } = useProfile();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<Record<string, unknown> | null>(null);

  const awards = profile?.awards || [];

  // Group by level
  const awardsByLevel = awards.reduce((acc, award) => {
    const level = award.level || "other";
    if (!acc[level]) acc[level] = [];
    acc[level].push(award);
    return acc;
  }, {} as Record<string, typeof awards>);

  const levelOrder = ["international", "national", "state", "regional", "school", "other"];
  const sortedLevels = Object.keys(awardsByLevel).sort(
    (a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b)
  );

  const handleSaveAward = async (data: Record<string, unknown>) => {
    const isEdit = !!editingAward?.id;
    const response = await fetch(
      isEdit ? `/api/profile/awards/${editingAward.id}` : "/api/profile/awards",
      {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }
    );
    if (response.ok) {
      await refreshProfile();
      setIsModalOpen(false);
      setEditingAward(null);
    }
  };

  const handleDeleteAward = async (id: string) => {
    await fetch(`/api/profile/awards/${id}`, { method: "DELETE" });
    refreshProfile();
  };

  const openAddModal = () => {
    setEditingAward(null);
    setIsModalOpen(true);
  };

  const openEditModal = (award: Record<string, unknown>) => {
    setEditingAward(award);
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
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-text-main">Awards</h1>
              <p className="text-text-muted">Honors and recognitions</p>
            </div>
          </div>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Award
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {awards.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-[20px] p-12 text-center shadow-card">
          <Trophy className="w-12 h-12 text-text-light mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-text-main mb-2">No awards yet</h3>
          <p className="text-text-muted mb-6">Add your honors, recognitions, and achievements</p>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4" />
            Add Your First Award
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedLevels.map(level => (
            <div key={level}>
              <h3 className="font-display font-bold text-text-main mb-3 flex items-center gap-2 capitalize">
                {level} Level
                <span className="text-sm font-normal text-text-muted">
                  ({awardsByLevel[level].length})
                </span>
              </h3>
              <div className="bg-white border border-border-subtle rounded-[16px] overflow-hidden shadow-card">
                {awardsByLevel[level].map((award, i) => (
                  <div 
                    key={award.id}
                    className={cn(
                      "flex items-center justify-between p-4 group hover:bg-bg-sidebar/50 transition-colors",
                      i !== awardsByLevel[level].length - 1 && "border-b border-border-subtle"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-2 py-1 rounded shrink-0",
                        LEVEL_STYLES[level] || "bg-gray-100 text-gray-600"
                      )}>
                        {level}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-text-main truncate">{award.title}</div>
                        {award.organization && (
                          <div className="text-xs text-text-muted">{award.organization}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {award.year && (
                        <span className="text-sm text-text-muted">{award.year}</span>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEditModal(award)}
                          className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteAward(award.id)}
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
        onClose={() => { setIsModalOpen(false); setEditingAward(null); }}
        title={editingAward ? "Edit Award" : "Add Award"}
        description="Add an honor or recognition you've received"
      >
        <AwardForm
          initialData={editingAward || undefined}
          onSubmit={handleSaveAward}
          onCancel={() => { setIsModalOpen(false); setEditingAward(null); }}
        />
      </Modal>
    </>
  );
}

