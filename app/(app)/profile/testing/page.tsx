"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  PenTool, 
  ChevronLeft,
  Plus,
  Trash2,
  Pencil,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { SATScoreForm, ACTScoreForm, APScoreForm } from "@/components/profile";

type ModalType = "sat" | "act" | "ap" | null;

export default function TestingPage() {
  const { profile, isLoading, error, refreshProfile } = useProfile();
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingScore, setEditingScore] = useState<Record<string, unknown> | null>(null);

  const satScores = profile?.testing?.satScores || [];
  const actScores = profile?.testing?.actScores || [];
  const apScores = profile?.testing?.apScores || [];

  const bestSAT = satScores.length > 0 ? Math.max(...satScores.map(s => s.total)) : null;
  const bestACT = actScores.length > 0 ? Math.max(...actScores.map(s => s.composite)) : null;

  // SAT Handlers
  const handleSaveSAT = async (data: Record<string, unknown>) => {
    const isEdit = !!editingScore?.id;
    const response = await fetch(
      isEdit ? `/api/profile/testing/sat/${editingScore.id}` : "/api/profile/testing/sat",
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

  const handleDeleteSAT = async (id: string) => {
    await fetch(`/api/profile/testing/sat/${id}`, { method: "DELETE" });
    refreshProfile();
  };

  // ACT Handlers
  const handleSaveACT = async (data: Record<string, unknown>) => {
    const isEdit = !!editingScore?.id;
    const response = await fetch(
      isEdit ? `/api/profile/testing/act/${editingScore.id}` : "/api/profile/testing/act",
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

  const handleDeleteACT = async (id: string) => {
    await fetch(`/api/profile/testing/act/${id}`, { method: "DELETE" });
    refreshProfile();
  };

  // AP Handlers
  const handleSaveAP = async (data: Record<string, unknown>) => {
    const isEdit = !!editingScore?.id;
    const response = await fetch(
      isEdit ? `/api/profile/testing/ap/${editingScore.id}` : "/api/profile/testing/ap",
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

  const handleDeleteAP = async (id: string) => {
    await fetch(`/api/profile/testing/ap/${id}`, { method: "DELETE" });
    refreshProfile();
  };

  const openModal = (type: ModalType, score?: Record<string, unknown>) => {
    setModalType(type);
    setEditingScore(score || null);
  };

  const closeModal = () => {
    setModalType(null);
    setEditingScore(null);
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

  const hasAnyScores = satScores.length > 0 || actScores.length > 0;

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
              <PenTool className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-text-main">Testing</h1>
              <p className="text-text-muted">SAT, ACT, and AP exam scores</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openModal("sat")}>
              <Plus className="w-4 h-4" />
              Add SAT
            </Button>
            <Button variant="secondary" onClick={() => openModal("act")}>
              <Plus className="w-4 h-4" />
              Add ACT
            </Button>
            <Button variant="secondary" onClick={() => openModal("ap")}>
              <Plus className="w-4 h-4" />
              Add AP
            </Button>
          </div>
        </div>
      </div>

      {/* Best Scores Summary */}
      {hasAnyScores && (
        <div className="bg-white border border-border-subtle rounded-[16px] p-5 mb-6 shadow-card">
          <div className="flex flex-wrap items-center gap-8">
            {bestSAT !== null && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Best SAT</div>
                <div className="text-3xl font-mono font-bold text-accent-primary">{bestSAT}</div>
                <div className="text-xs text-text-muted">{satScores.length} attempt{satScores.length > 1 ? "s" : ""}</div>
              </div>
            )}
            {bestACT !== null && (
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Best ACT</div>
                <div className="text-3xl font-mono font-bold text-accent-primary">{bestACT}</div>
                <div className="text-xs text-text-muted">{actScores.length} attempt{actScores.length > 1 ? "s" : ""}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasAnyScores && (
        <div className="bg-white border border-border-subtle rounded-[20px] p-12 text-center shadow-card mb-6">
          <PenTool className="w-12 h-12 text-text-light mx-auto mb-4" />
          <h3 className="font-display font-bold text-lg text-text-main mb-2">No test scores yet</h3>
          <p className="text-text-muted mb-6">Add your SAT, ACT, or AP scores to track your progress</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Button onClick={() => openModal("sat")}>
              <Plus className="w-4 h-4" />
              Add SAT Score
            </Button>
            <Button variant="secondary" onClick={() => openModal("act")}>
              <Plus className="w-4 h-4" />
              Add ACT Score
            </Button>
            <Button variant="secondary" onClick={() => openModal("ap")}>
              <Plus className="w-4 h-4" />
              Add AP Score
            </Button>
          </div>
        </div>
      )}

      {/* SAT Scores Section */}
      {satScores.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-text-main">SAT Scores</h2>
            <button 
              onClick={() => openModal("sat")}
              className="text-sm text-accent-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Score
            </button>
          </div>
          <div className="bg-white border border-border-subtle rounded-[16px] overflow-hidden shadow-card">
            {satScores.map((score, i) => (
              <div 
                key={score.id}
                className={cn(
                  "flex items-center justify-between p-4 group hover:bg-bg-sidebar/50 transition-colors",
                  i !== satScores.length - 1 && "border-b border-border-subtle"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(score.testDate).toLocaleDateString("en-US", { 
                        month: "long", 
                        year: "numeric" 
                      })}
                    </span>
                  </div>
                  {score.total === bestSAT && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-accent-surface text-accent-primary">
                      Best
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-mono font-bold text-text-main">{score.math}</div>
                      <div className="text-xs text-text-muted">Math</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold text-text-main">{score.reading}</div>
                      <div className="text-xs text-text-muted">R&W</div>
                    </div>
                    <div className="h-8 w-px bg-border-subtle" />
                    <div className="text-center">
                      <div className="font-mono font-bold text-accent-primary text-xl">{score.total}</div>
                      <div className="text-xs text-text-muted">Total</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal("sat", score)}
                      className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSAT(score.id)}
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
      )}

      {/* ACT Scores Section */}
      {actScores.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-lg text-text-main">ACT Scores</h2>
            <button 
              onClick={() => openModal("act")}
              className="text-sm text-accent-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Score
            </button>
          </div>
          <div className="bg-white border border-border-subtle rounded-[16px] overflow-hidden shadow-card">
            {actScores.map((score, i) => (
              <div 
                key={score.id}
                className={cn(
                  "flex items-center justify-between p-4 group hover:bg-bg-sidebar/50 transition-colors",
                  i !== actScores.length - 1 && "border-b border-border-subtle"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-text-muted">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(score.testDate).toLocaleDateString("en-US", { 
                        month: "long", 
                        year: "numeric" 
                      })}
                    </span>
                  </div>
                  {score.composite === bestACT && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-accent-surface text-accent-primary">
                      Best
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="text-center">
                      <div className="font-mono font-bold text-text-main">{score.english}</div>
                      <div className="text-xs text-text-muted">Eng</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold text-text-main">{score.math}</div>
                      <div className="text-xs text-text-muted">Math</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold text-text-main">{score.reading}</div>
                      <div className="text-xs text-text-muted">Read</div>
                    </div>
                    <div className="text-center">
                      <div className="font-mono font-bold text-text-main">{score.science}</div>
                      <div className="text-xs text-text-muted">Sci</div>
                    </div>
                    <div className="h-8 w-px bg-border-subtle" />
                    <div className="text-center">
                      <div className="font-mono font-bold text-accent-primary text-xl">{score.composite}</div>
                      <div className="text-xs text-text-muted">Comp</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => openModal("act", score)}
                      className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteACT(score.id)}
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
      )}

      {/* AP Scores Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg text-text-main">AP Exam Scores</h2>
          <button
            onClick={() => openModal("ap")}
            className="text-sm text-accent-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Score
          </button>
        </div>
        {apScores.length > 0 ? (
          <div className="bg-white border border-border-subtle rounded-[16px] overflow-hidden shadow-card">
            {apScores.map((score, i) => (
              <div
                key={score.id}
                className={cn(
                  "flex items-center justify-between p-4 group hover:bg-bg-sidebar/50 transition-colors",
                  i !== apScores.length - 1 && "border-b border-border-subtle"
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium text-text-main">{score.subject}</span>
                  {score.year && (
                    <span className="text-xs text-text-muted">{score.year}</span>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-lg",
                    score.score >= 4 ? "bg-green-100 text-green-700" :
                    score.score === 3 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {score.score}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openModal("ap", score)}
                      className="p-2 text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteAP(score.id)}
                      className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-border-subtle border-dashed rounded-[16px] p-6 text-center shadow-card">
            <p className="text-text-muted text-sm mb-3">No AP scores added yet</p>
            <Button variant="secondary" size="sm" onClick={() => openModal("ap")}>
              <Plus className="w-4 h-4" />
              Add AP Score
            </Button>
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal 
        isOpen={modalType === "sat"} 
        onClose={closeModal}
        title={editingScore ? "Edit SAT Score" : "Add SAT Score"}
        description="Enter your SAT section scores and test date"
      >
        <SATScoreForm
          initialData={editingScore || undefined}
          onSubmit={handleSaveSAT}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        isOpen={modalType === "act"}
        onClose={closeModal}
        title={editingScore ? "Edit ACT Score" : "Add ACT Score"}
        description="Enter your ACT section scores and test date"
      >
        <ACTScoreForm
          initialData={editingScore || undefined}
          onSubmit={handleSaveACT}
          onCancel={closeModal}
        />
      </Modal>

      <Modal
        isOpen={modalType === "ap"}
        onClose={closeModal}
        title={editingScore ? "Edit AP Score" : "Add AP Score"}
        description="Enter your AP exam subject and score"
      >
        <APScoreForm
          initialData={editingScore || undefined}
          onSubmit={handleSaveAP}
          onCancel={closeModal}
        />
      </Modal>
    </>
  );
}

