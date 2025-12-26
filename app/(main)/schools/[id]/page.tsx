"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Heart,
  ExternalLink,
  Plus,
  FileText,
  TrendingUp,
  RefreshCw,
  Calendar,
  DollarSign,
  Users,
  GraduationCap,
  Trash2,
  Edit3,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SchoolLogo } from "@/components/ui/SchoolLogo";
import { cn } from "@/lib/utils";

// Lazy-load Novel editor modal - only loads when user opens note editor
const NoteEditorModal = dynamic(
  () => import("@/components/schools/NoteEditorModal").then(mod => mod.NoteEditorModal),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
          <p className="text-sm text-text-muted">Loading editor...</p>
        </div>
      </div>
    ),
  }
);

// =============================================================================
// TYPES
// =============================================================================

interface SchoolNote {
  id: string;
  title: string | null;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface School {
  id: string;
  name: string;
  shortName: string | null;
  city: string | null;
  state: string | null;
  country: string;
  type: string | null;
  acceptanceRate: number | null;
  satRange25: number | null;
  satRange75: number | null;
  actRange25: number | null;
  actRange75: number | null;
  avgGpaUnweighted: number | null;
  tuition: number | null;
  undergradEnrollment: number | null;
  studentFacultyRatio: string | null;
  websiteUrl: string | null;
  deadlineEd: string | null;
  deadlineEa: string | null;
  deadlineRd: string | null;
}

interface StudentSchoolData {
  id: string;
  tier: string;
  isDream: boolean;
  status: string;
  interestLevel: string | null;
  applicationType: string | null;
  calculatedChance: number | null;
  chanceUpdatedAt: string | null;
  school: School;
  richNotes: SchoolNote[];
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function SchoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<StudentSchoolData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Note modal state
  const [noteModalState, setNoteModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    noteId?: string;
    initialContent?: Record<string, unknown>;
    initialTitle?: string;
  }>({ isOpen: false, mode: "create" });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/profile/schools/${id}`);
      if (!res.ok) throw new Error("Failed to fetch school");
      const schoolData = await res.json();
      setData(schoolData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleNoteCreated = async () => {
    setNoteModalState({ isOpen: false, mode: "create" });
    await fetchData();
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Delete this note?")) return;
    await fetch(`/api/profile/schools/${id}/notes/${noteId}`, { method: "DELETE" });
    await fetchData();
  };

  const openEditNote = (note: SchoolNote) => {
    setNoteModalState({
      isOpen: true,
      mode: "edit",
      noteId: note.id,
      initialContent: note.content,
      initialTitle: note.title || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">School not found</p>
        <Link href="/schools" className="text-accent-primary hover:underline mt-2 block">
          ← Back to Schools
        </Link>
      </div>
    );
  }

  const { school, richNotes } = data;

  return (
    <>
      {/* Back Navigation */}
      <Link 
        href="/schools"
        className="inline-flex items-center gap-2 text-text-muted hover:text-text-main transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Schools
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-border-subtle p-6 mb-6">
        <div className="flex items-start gap-5">
          <SchoolLogo 
            name={school.name} 
            shortName={school.shortName}
            websiteUrl={school.websiteUrl}
            size="lg"
            className="w-16 h-16"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="font-display font-bold text-2xl text-text-main truncate">
                {school.name}
              </h1>
              {data.isDream && (
                <Heart className="w-5 h-5 text-pink-500 fill-pink-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-text-muted">
              {school.city && school.state ? `${school.city}, ${school.state}` : school.country}
              {school.type && ` • ${capitalizeFirst(school.type)}`}
            </p>
            <div className="flex items-center gap-4 mt-3">
              <TierBadge tier={data.tier} />
              <StatusBadge status={data.status} />
              {school.websiteUrl && (
                <a 
                  href={school.websiteUrl.startsWith("http") ? school.websiteUrl : `https://${school.websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent-primary hover:underline flex items-center gap-1"
                >
                  Visit Website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Notes (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notes Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent-primary" />
                <h2 className="font-display font-bold text-lg text-text-main">My Notes</h2>
                <span className="text-xs text-text-muted bg-bg-sidebar px-2 py-0.5 rounded-full">
                  {richNotes.length}
                </span>
              </div>
              <Button 
                size="sm" 
                onClick={() => setNoteModalState({ isOpen: true, mode: "create" })}
              >
                <Plus className="w-4 h-4" />
                Add Note
              </Button>
            </div>

            {richNotes.length === 0 ? (
              <div className="text-center py-12 text-text-muted">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No notes yet</p>
                <p className="text-sm mt-1">Click "Add Note" to start capturing your thoughts about {school.shortName || school.name}.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {richNotes.map(note => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    onEdit={() => openEditNote(note)}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column - Sidebar (1/3) */}
        <div className="space-y-5">
          {/* Chances Widget */}
          <ChancesWidget 
            chance={data.calculatedChance}
            updatedAt={data.chanceUpdatedAt}
            schoolId={school.id}
          />

          {/* Quick Facts */}
          <QuickFacts school={school} />

          {/* Deadlines */}
          {(school.deadlineEd || school.deadlineEa || school.deadlineRd) && (
            <DeadlinesCard school={school} />
          )}
        </div>
      </div>

      {/* Note Editor Modal */}
      <NoteEditorModal
        isOpen={noteModalState.isOpen}
        onClose={() => setNoteModalState({ isOpen: false, mode: "create" })}
        onSave={handleNoteCreated}
        studentSchoolId={id}
        mode={noteModalState.mode}
        noteId={noteModalState.noteId}
        initialContent={noteModalState.initialContent}
        initialTitle={noteModalState.initialTitle}
      />
    </>
  );
}

// =============================================================================
// COMPONENTS
// =============================================================================

function TierBadge({ tier }: { tier: string }) {
  const styles = {
    reach: "bg-rose-50 text-rose-700 border-rose-200",
    target: "bg-amber-50 text-amber-700 border-amber-200",
    safety: "bg-emerald-50 text-emerald-700 border-emerald-200",
  };
  
  return (
    <span className={cn(
      "px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize",
      styles[tier as keyof typeof styles] || "bg-gray-50 text-gray-700 border-gray-200"
    )}>
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const statusLabels: Record<string, string> = {
    researching: "Researching",
    planning: "Planning",
    in_progress: "In Progress",
    submitted: "Submitted",
    accepted: "Accepted! 🎉",
    rejected: "Rejected",
    waitlisted: "Waitlisted",
    deferred: "Deferred",
    withdrawn: "Withdrawn",
    committed: "Committed ✨",
  };
  
  return (
    <span className="text-xs text-text-muted">
      {statusLabels[status] || status}
    </span>
  );
}

function NoteCard({ 
  note, 
  onEdit, 
  onDelete,
}: { 
  note: SchoolNote; 
  onEdit: () => void;
  onDelete: () => void;
}) {
  const date = new Date(note.createdAt);
  const formattedDate = date.toLocaleDateString("en-US", { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
  
  // Extract plain text preview from TipTap content
  const preview = extractTextPreview(note.content, 150);
  
  return (
    <div 
      className="group p-4 bg-bg-sidebar rounded-xl hover:bg-bg-sidebar/80 transition-colors cursor-pointer"
      onClick={onEdit}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h3 className="font-medium text-text-main mb-1 truncate">{note.title}</h3>
          )}
          <p className="text-sm text-text-muted line-clamp-2">{preview || "Empty note"}</p>
          <p className="text-xs text-text-light mt-2">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1.5 text-text-muted hover:text-accent-primary hover:bg-white rounded-lg transition-colors"
            title="Edit note"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1.5 text-text-muted hover:text-red-600 hover:bg-white rounded-lg transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Click anywhere hint */}
      <div className="text-xs text-text-light mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        Click to view full note
      </div>
    </div>
  );
}

function ChancesWidget({ 
  chance, 
  updatedAt,
  schoolId,
}: { 
  chance: number | null;
  updatedAt: string | null;
  schoolId: string;
}) {
  const hasChance = chance !== null;
  
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-accent-primary" />
        <h3 className="font-display font-bold text-text-main">Your Chances</h3>
      </div>
      
      {hasChance ? (
        <>
          <div className="text-4xl font-bold text-text-main mb-2">
            {Math.round(chance * 100)}%
          </div>
          <p className="text-sm text-text-muted mb-4">
            Last updated: {new Date(updatedAt!).toLocaleDateString("en-US", { 
              month: "short", 
              day: "numeric" 
            })}
          </p>
          <Link href={`/chances?school=${schoolId}`}>
            <Button variant="secondary" className="w-full">
              <RefreshCw className="w-4 h-4" />
              Update Chances
            </Button>
          </Link>
        </>
      ) : (
        <>
          <p className="text-text-muted text-sm mb-4">
            Calculate your admission chances based on your profile.
          </p>
          <Link href={`/chances?school=${schoolId}`}>
            <Button className="w-full">
              <TrendingUp className="w-4 h-4" />
              Check My Chances
            </Button>
          </Link>
        </>
      )}
    </Card>
  );
}

function QuickFacts({ school }: { school: School }) {
  const facts = [];
  
  if (school.acceptanceRate !== null) {
    facts.push({
      icon: GraduationCap,
      label: "Acceptance Rate",
      value: `${(school.acceptanceRate * 100).toFixed(1)}%`,
    });
  }
  
  if (school.satRange25 && school.satRange75) {
    facts.push({
      icon: FileText,
      label: "SAT Range",
      value: `${school.satRange25} - ${school.satRange75}`,
    });
  }
  
  if (school.actRange25 && school.actRange75) {
    facts.push({
      icon: FileText,
      label: "ACT Range",
      value: `${school.actRange25} - ${school.actRange75}`,
    });
  }
  
  if (school.tuition) {
    facts.push({
      icon: DollarSign,
      label: "Tuition",
      value: `$${school.tuition.toLocaleString()}/yr`,
    });
  }
  
  if (school.undergradEnrollment) {
    facts.push({
      icon: Users,
      label: "Undergrad Size",
      value: school.undergradEnrollment.toLocaleString(),
    });
  }
  
  if (school.studentFacultyRatio) {
    facts.push({
      icon: Users,
      label: "Student:Faculty",
      value: school.studentFacultyRatio,
    });
  }
  
  if (facts.length === 0) return null;
  
  return (
    <Card className="p-5">
      <h3 className="font-display font-bold text-text-main mb-4">Quick Facts</h3>
      <div className="space-y-3">
        {facts.map((fact, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-text-muted">
              <fact.icon className="w-4 h-4" />
              {fact.label}
            </div>
            <span className="font-medium text-text-main">{fact.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DeadlinesCard({ school }: { school: School }) {
  const deadlines = [];
  
  if (school.deadlineEd) {
    deadlines.push({ label: "Early Decision", date: school.deadlineEd });
  }
  if (school.deadlineEa) {
    deadlines.push({ label: "Early Action", date: school.deadlineEa });
  }
  if (school.deadlineRd) {
    deadlines.push({ label: "Regular Decision", date: school.deadlineRd });
  }
  
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-accent-primary" />
        <h3 className="font-display font-bold text-text-main">Deadlines</h3>
      </div>
      <div className="space-y-3">
        {deadlines.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-text-muted">{d.label}</span>
            <span className="font-medium text-text-main">
              {new Date(d.date).toLocaleDateString("en-US", { 
                month: "short", 
                day: "numeric" 
              })}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function extractTextPreview(content: Record<string, unknown>, maxLength: number): string {
  try {
    // TipTap content is a JSON structure with content array
    const textParts: string[] = [];
    
    function extractText(node: unknown): void {
      if (!node || typeof node !== "object") return;
      const n = node as Record<string, unknown>;
      
      if (n.type === "text" && typeof n.text === "string") {
        textParts.push(n.text);
      }
      if (Array.isArray(n.content)) {
        n.content.forEach(extractText);
      }
    }
    
    extractText(content);
    const fullText = textParts.join(" ").trim();
    
    if (fullText.length <= maxLength) return fullText;
    return fullText.slice(0, maxLength).trim() + "...";
  } catch {
    return "";
  }
}

