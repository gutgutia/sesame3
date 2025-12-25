"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  Loader2, 
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Target,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  BarChart3,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "@/components/ui/SchoolLogo";
import { ChancesResult } from "@/lib/chances/types";
import { useProfile } from "@/lib/context/ProfileContext";

// =============================================================================
// TYPES
// =============================================================================

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
}

interface AssessedSchool {
  schoolId: string;
  school: School;
  result: ChancesResult;
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ChancesPage() {
  const searchParams = useSearchParams();
  const initialSchoolId = searchParams.get("school");
  const { profile } = useProfile();
  
  // Assessed schools state
  const [assessedSchools, setAssessedSchools] = useState<AssessedSchool[]>([]);
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  
  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Calculation state
  const [calculatingSchoolId, setCalculatingSchoolId] = useState<string | null>(null);
  const [calculationProgress, setCalculationProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial school if provided via URL
  const loadSchoolById = useCallback(async (schoolId: string) => {
    try {
      const res = await fetch(`/api/schools/${schoolId}`);
      if (res.ok) {
        const school = await res.json();
        await calculateForSchool(school);
      }
    } catch (error) {
      console.error("Failed to load school:", error);
    }
  }, []);

  useEffect(() => {
    if (initialSchoolId) {
      loadSchoolById(initialSchoolId);
    }
  }, [initialSchoolId, loadSchoolById]);

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
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchSchools(query);
    }, 300);
  };

  // Calculate chances for a school
  const calculateForSchool = async (school: School) => {
    // Check if already assessed
    const existing = assessedSchools.find(s => s.schoolId === school.id);
    if (existing) {
      setExpandedSchoolId(school.id);
      setShowSearch(false);
      return;
    }
    
    setCalculatingSchoolId(school.id);
    setError(null);
    setCalculationProgress("Analyzing your profile...");
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    
    try {
      // Simulate progress steps
      setTimeout(() => setCalculationProgress("Comparing academics..."), 500);
      setTimeout(() => setCalculationProgress("Evaluating activities..."), 1500);
      setTimeout(() => setCalculationProgress("Assessing overall fit..."), 2500);
      
      const res = await fetch("/api/chances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: school.id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to calculate chances");
      }
      
      const result = await res.json();
      
      // Add to assessed schools
      setAssessedSchools(prev => [
        { schoolId: school.id, school, result },
        ...prev,
      ]);
      setExpandedSchoolId(school.id);
    } catch (error) {
      console.error("Calculation error:", error);
      setError(error instanceof Error ? error.message : "Failed to calculate chances");
    } finally {
      setCalculatingSchoolId(null);
      setCalculationProgress("");
    }
  };

  // Handle school selection from search
  const handleSelectSchool = (school: School) => {
    setShowResults(false);
    calculateForSchool(school);
  };

  // Toggle expand/collapse
  const toggleExpand = (schoolId: string) => {
    setExpandedSchoolId(expandedSchoolId === schoolId ? null : schoolId);
  };

  // Recalculate for a school
  const recalculate = async (school: School) => {
    // Remove from list first
    setAssessedSchools(prev => prev.filter(s => s.schoolId !== school.id));
    // Then recalculate
    await calculateForSchool(school);
  };

  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      {/* Header */}
      <div className="border-b border-border-subtle bg-surface-secondary/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-text-primary">
                  Your Chances
                </h1>
              </div>
              <p className="text-text-secondary">
                See how you stack up against your target schools
              </p>
            </div>
            
            {/* Add School Button */}
            {!showSearch && (
              <Button 
                onClick={() => {
                  setShowSearch(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                variant="secondary"
              >
                <Plus className="w-4 h-4" />
                Add School
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Search (shown when adding) */}
        {showSearch && (
          <div className="relative mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowResults(true)}
                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                placeholder="Search for a school to check your chances..."
                className={cn(
                  "w-full pl-12 pr-12 py-4 rounded-xl",
                  "bg-surface-secondary border border-border-subtle",
                  "text-text-primary placeholder:text-text-muted",
                  "focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary",
                  "transition-all"
                )}
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
              >
                <XCircle className="w-5 h-5" />
              </button>
              {isSearching && (
                <Loader2 className="absolute right-12 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted animate-spin" />
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-surface-secondary border border-border-subtle rounded-xl shadow-lg overflow-hidden z-50">
                {searchResults.map((school) => (
                  <button
                    key={school.id}
                    onClick={() => handleSelectSchool(school)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-tertiary transition-colors text-left"
                  >
                    <SchoolLogo name={school.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">
                        {school.name}
                      </div>
                      <div className="text-sm text-text-muted">
                        {school.city}, {school.state}
                        {school.acceptanceRate && (
                          <span className="ml-2">
                            • {(school.acceptanceRate * 100).toFixed(1)}% acceptance
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Calculating State */}
        {calculatingSchoolId && (
          <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-8 mb-6 text-center">
            <Loader2 className="w-12 h-12 text-accent-primary mx-auto mb-4 animate-spin" />
            <p className="text-text-primary font-medium mb-2">{calculationProgress}</p>
            <p className="text-text-muted text-sm">This may take a few seconds...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Assessed Schools */}
        {assessedSchools.length > 0 && (
          <div className="space-y-4">
            {assessedSchools.map(({ schoolId, school, result }) => (
              <SchoolChancesCard
                key={schoolId}
                school={school}
                result={result}
                isExpanded={expandedSchoolId === schoolId}
                onToggle={() => toggleExpand(schoolId)}
                onRecalculate={() => recalculate(school)}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {assessedSchools.length === 0 && !calculatingSchoolId && !showSearch && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Check Your Chances
            </h3>
            <p className="text-text-secondary max-w-md mx-auto mb-6">
              Add a school to see a personalized assessment of your admission chances based on your profile and goals.
            </p>
            <Button 
              onClick={() => {
                setShowSearch(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Your First School
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SCHOOL CHANCES CARD
// =============================================================================

interface SchoolChancesCardProps {
  school: School;
  result: ChancesResult;
  isExpanded: boolean;
  onToggle: () => void;
  onRecalculate: () => void;
}

function SchoolChancesCard({ 
  school, 
  result, 
  isExpanded, 
  onToggle,
  onRecalculate,
}: SchoolChancesCardProps) {
  const tierColors: Record<string, string> = {
    safety: "bg-green-500/20 text-green-400",
    likely: "bg-emerald-500/20 text-emerald-400",
    target: "bg-yellow-500/20 text-yellow-400",
    reach: "bg-orange-500/20 text-orange-400",
    unlikely: "bg-red-500/20 text-red-400",
  };

  return (
    <div className="bg-surface-secondary border border-border-subtle rounded-2xl overflow-hidden">
      {/* Collapsed Header - Always Visible */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-center gap-4 hover:bg-surface-tertiary/50 transition-colors text-left"
      >
        <SchoolLogo name={school.name} size="md" />
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary truncate">
            {school.name}
          </h3>
          <p className="text-sm text-text-muted">
            {school.city}, {school.state}
            {school.acceptanceRate && (
              <span> • {(school.acceptanceRate * 100).toFixed(1)}% acceptance</span>
            )}
          </p>
        </div>
        
        {/* Probability Badge */}
        <div className="text-right">
          <div className="text-2xl font-bold text-accent-primary">
            {result.probability}%
          </div>
          <div className={cn(
            "inline-block px-2 py-0.5 rounded-full text-xs font-medium",
            tierColors[result.tier] || "bg-gray-500/20 text-gray-400"
          )}>
            {result.tier.charAt(0).toUpperCase() + result.tier.slice(1)}
          </div>
        </div>
        
        {/* Expand/Collapse Icon */}
        <div className="text-text-muted">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-border-subtle">
          {/* Summary */}
          <p className="text-text-secondary mt-5 mb-6">
            {result.summary}
          </p>
          
          {/* Factor Breakdown */}
          <div className="bg-surface-tertiary rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-accent-primary" />
              <h4 className="font-medium text-text-primary">Factor Breakdown</h4>
            </div>
            
            <div className="space-y-3">
              <FactorBar 
                label="Academics" 
                score={result.factors.academics.score}
                impact={result.factors.academics.impact}
                details={result.factors.academics.details}
              />
              <FactorBar 
                label="Testing" 
                score={result.factors.testing.score}
                impact={result.factors.testing.impact}
                details={result.factors.testing.details}
              />
              <FactorBar 
                label="Activities" 
                score={result.factors.activities.score}
                impact={result.factors.activities.impact}
                details={result.factors.activities.details}
              />
              <FactorBar 
                label="Awards" 
                score={result.factors.awards.score}
                impact={result.factors.awards.impact}
                details={result.factors.awards.details}
              />
            </div>
          </div>
          
          {/* Improvements */}
          {result.improvements.length > 0 && (
            <div className="bg-surface-tertiary rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <h4 className="font-medium text-text-primary">What Could Help</h4>
              </div>
              
              <div className="space-y-2">
                {result.improvements.map((improvement, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3"
                  >
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full mt-2",
                      improvement.priority === "high" && "bg-accent-primary",
                      improvement.priority === "medium" && "bg-yellow-400",
                      improvement.priority === "low" && "bg-text-muted"
                    )} />
                    <div className="flex-1">
                      <span className="text-text-primary">{improvement.action}</span>
                      <span className="text-accent-primary text-sm ml-2">
                        {improvement.potentialImpact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Clock className="w-4 h-4" />
              Checked {new Date(result.calculatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </div>
            
            <Button 
              variant="secondary" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRecalculate();
              }}
            >
              <Sparkles className="w-4 h-4" />
              Recalculate
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// FACTOR BAR COMPONENT
// =============================================================================

interface FactorBarProps {
  label: string;
  score: number;
  impact: string;
  details: string;
}

function FactorBar({ label, score, impact, details }: FactorBarProps) {
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "strong_positive": return "bg-green-500";
      case "positive": return "bg-emerald-400";
      case "neutral": return "bg-yellow-400";
      case "negative": return "bg-orange-400";
      case "strong_negative": return "bg-red-500";
      default: return "bg-text-muted";
    }
  };
  
  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "strong_positive":
      case "positive":
        return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case "neutral":
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />;
      case "negative":
      case "strong_negative":
        return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          {getImpactIcon(impact)}
          <span className="text-sm font-medium text-text-primary">{label}</span>
        </div>
        <span className="text-xs text-text-muted">{score}/100</span>
      </div>
      <div className="h-1.5 bg-surface-primary rounded-full overflow-hidden mb-1">
        <div 
          className={cn("h-full rounded-full transition-all", getImpactColor(impact))}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-text-muted">{details}</p>
    </div>
  );
}
