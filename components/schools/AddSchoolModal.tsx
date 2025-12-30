"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Loader2, Heart, Plus, MessageCircle, PlusCircle, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { SchoolLogo } from "@/components/ui/SchoolLogo";

interface AddSchoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchoolAdded: () => void;
}

interface School {
  id: string;
  name: string;
  shortName: string | null;
  city: string | null;
  state: string | null;
  type: string | null;
  acceptanceRate: number | null;
  satRange25: number | null;
  satRange75: number | null;
  websiteUrl: string | null;
}

type Tier = "reach" | "target" | "safety";

export function AddSchoolModal({ isOpen, onClose, onSchoolAdded }: AddSchoolModalProps) {
  // Mode: "search" for database search, "custom" for custom entry
  const [mode, setMode] = useState<"search" | "custom">("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Selection state (for linked schools)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  // Custom school state
  const [customName, setCustomName] = useState("");
  const [customLocation, setCustomLocation] = useState("");

  // Common fields
  const [tier, setTier] = useState<Tier>("target");
  const [isDream, setIsDream] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode("search");
      setSearchQuery("");
      setSearchResults([]);
      setSelectedSchool(null);
      setCustomName("");
      setCustomLocation("");
      setTier("target");
      setIsDream(false);
      setShowResults(false);
    }
  }, [isOpen]);

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounced search
  const searchSchools = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/schools/search?q=${encodeURIComponent(query)}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.schools || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setShowResults(true);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchSchools(query);
    }, 300);
  };

  // Handle school selection
  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setSearchQuery(school.shortName || school.name);
    setShowResults(false);
  };

  // Handle save
  const handleSave = async () => {
    // Validate based on mode
    if (mode === "search" && !selectedSchool) return;
    if (mode === "custom" && !customName.trim()) return;

    setIsSaving(true);
    try {
      const body =
        mode === "search"
          ? {
              schoolId: selectedSchool!.id,
              tier,
              isDream,
            }
          : {
              customName: customName.trim(),
              customLocation: customLocation.trim() || undefined,
              tier,
              isDream,
            };

      const res = await fetch("/api/profile/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        onSchoolAdded();
        onClose();
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to add school:", errorData.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error adding school:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Switch to custom mode with search query pre-filled
  const switchToCustomMode = () => {
    setCustomName(searchQuery);
    setMode("custom");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full h-[90vh] sm:h-auto sm:max-h-[85vh] max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-float overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pt-safe border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-3">
            {mode === "custom" && (
              <button
                onClick={() => setMode("search")}
                className="p-1.5 -ml-1.5 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="font-display font-bold text-lg text-text-main">
                {mode === "search" ? "Add School" : "Add Custom School"}
              </h2>
              <p className="text-sm text-text-muted">
                {mode === "search" ? "Search and add to your list" : "Add a school not in our database"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-5">
          {mode === "search" ? (
            <>
              {/* Search Input */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
                    placeholder="Search for a college..."
                    className="w-full pl-10 pr-10 py-3 bg-bg-sidebar border border-border-medium rounded-xl text-[15px] text-text-main placeholder:text-text-light focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted animate-spin" />
                  )}
                </div>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-border-medium rounded-xl shadow-lg max-h-64 overflow-auto">
                    {searchResults.map((school) => (
                      <button
                        key={school.id}
                        onClick={() => handleSelectSchool(school)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-bg-sidebar transition-colors text-left first:rounded-t-xl last:rounded-b-xl"
                      >
                        <SchoolLogo
                          name={school.name}
                          shortName={school.shortName}
                          websiteUrl={school.websiteUrl}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-text-main truncate">
                            {school.shortName || school.name}
                          </div>
                          <div className="text-xs text-text-muted truncate">
                            {school.city}, {school.state}
                            {school.acceptanceRate && (
                              <span className="ml-2">
                                • {Math.round(school.acceptanceRate * 100)}% acceptance
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results message - with option to add custom */}
                {showResults && searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-border-medium rounded-xl shadow-lg p-4">
                    <p className="text-sm text-text-muted text-center mb-3">
                      No schools found for &quot;{searchQuery}&quot;
                    </p>
                    <button
                      onClick={switchToCustomMode}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-accent-surface text-accent-primary rounded-lg text-sm font-medium hover:bg-accent-surface/80 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Add &quot;{searchQuery}&quot; as custom school
                    </button>
                  </div>
                )}
              </div>

              {/* Option to add custom school */}
              <button
                onClick={() => setMode("custom")}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-dashed border-border-medium rounded-xl text-sm text-text-muted hover:border-accent-primary hover:text-accent-primary hover:bg-accent-surface/30 transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                Add a school not in our database
              </button>

              {/* Selected School Display */}
              {selectedSchool && (
                <div className="p-4 bg-bg-sidebar rounded-xl border border-border-subtle">
                  <div className="flex items-center gap-3">
                    <SchoolLogo
                      name={selectedSchool.name}
                      shortName={selectedSchool.shortName}
                      websiteUrl={selectedSchool.websiteUrl}
                      size="lg"
                    />
                    <div>
                      <div className="font-display font-bold text-text-main">
                        {selectedSchool.shortName || selectedSchool.name}
                      </div>
                      <div className="text-sm text-text-muted">
                        {selectedSchool.city}, {selectedSchool.state}
                      </div>
                      {selectedSchool.satRange25 && selectedSchool.satRange75 && (
                        <div className="text-xs text-text-muted mt-1">
                          SAT: {selectedSchool.satRange25}–{selectedSchool.satRange75}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Custom School Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">
                    School Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g., XYZ University"
                    className="w-full py-3 px-4 bg-bg-sidebar border border-border-medium rounded-xl text-[15px] text-text-main placeholder:text-text-light focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    placeholder="e.g., California, USA"
                    className="w-full py-3 px-4 bg-bg-sidebar border border-border-medium rounded-xl text-[15px] text-text-main placeholder:text-text-light focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface"
                  />
                </div>
              </div>

              {/* Info note */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
                <strong>Note:</strong> Custom schools won&apos;t have acceptance rate or SAT data.
                You can still track your application progress.
              </div>
            </>
          )}

          {/* Tier Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Classification</label>
            <div className="grid grid-cols-3 gap-2">
              {(["reach", "target", "safety"] as Tier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={cn(
                    "py-2.5 px-3 rounded-xl text-sm font-medium capitalize transition-all border",
                    tier === t
                      ? t === "reach"
                        ? "bg-red-50 border-red-200 text-red-700"
                        : t === "target"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-green-50 border-green-200 text-green-700"
                      : "bg-bg-sidebar border-border-subtle text-text-muted hover:bg-bg-sidebar/80"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Dream School Toggle */}
          <button
            onClick={() => setIsDream(!isDream)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border transition-all",
              isDream
                ? "bg-pink-50 border-pink-200 text-pink-700"
                : "bg-bg-sidebar border-border-subtle text-text-muted hover:bg-bg-sidebar/80"
            )}
          >
            <Heart className={cn("w-4 h-4", isDream && "fill-current")} />
            {isDream ? "This is my dream school!" : "Mark as dream school"}
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 pb-safe border-t border-border-subtle space-y-3 shrink-0">
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                (mode === "search" && !selectedSchool) ||
                (mode === "custom" && !customName.trim()) ||
                isSaving
              }
              className="flex-1"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {mode === "search" ? "Add School" : "Add Custom School"}
            </Button>
          </div>

          {/* Chat option - only show in search mode */}
          {mode === "search" && (
            <a
              href="/advisor?mode=schools"
              className="flex items-center justify-center gap-2 text-sm text-text-muted hover:text-accent-primary transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Not sure? Chat with advisor for recommendations
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

