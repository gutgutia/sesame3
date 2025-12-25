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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "@/components/ui/SchoolLogo";
import { ChancesResult } from "@/lib/chances/types";

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

type CalculationMode = "current" | "projected";

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function ChancesPage() {
  const searchParams = useSearchParams();
  const initialSchoolId = searchParams.get("school");
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  // Selected school state
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  
  // Calculation state
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState("");
  const [chancesResult, setChancesResult] = useState<ChancesResult | null>(null);
  const [mode, setMode] = useState<CalculationMode>("current");
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [showSimulation, setShowSimulation] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadSchoolById = useCallback(async (schoolId: string) => {
    try {
      const res = await fetch(`/api/schools/${schoolId}`);
      if (res.ok) {
        const school = await res.json();
        setSelectedSchool(school);
      }
    } catch (error) {
      console.error("Failed to load school:", error);
    }
  }, []);

  // Load initial school if provided
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

  // Handle school selection
  const handleSelectSchool = (school: School) => {
    setSelectedSchool(school);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setChancesResult(null);
    setError(null);
  };

  // Calculate chances
  const handleCalculateChances = async () => {
    if (!selectedSchool) return;
    
    setIsCalculating(true);
    setError(null);
    setCalculationProgress("Analyzing your profile...");
    
    try {
      // Simulate progress steps
      setTimeout(() => setCalculationProgress("Comparing academics..."), 500);
      setTimeout(() => setCalculationProgress("Evaluating activities..."), 1500);
      setTimeout(() => setCalculationProgress("Assessing overall fit..."), 2500);
      
      const res = await fetch("/api/chances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolId: selectedSchool.id,
          mode,
          useLLM: true,
          useQuantitative: true,
        }),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to calculate chances");
      }
      
      const result = await res.json();
      setChancesResult(result);
    } catch (error) {
      console.error("Calculation error:", error);
      setError(error instanceof Error ? error.message : "Failed to calculate chances");
    } finally {
      setIsCalculating(false);
      setCalculationProgress("");
    }
  };

  return (
    <div className="min-h-screen bg-surface-primary pb-20">
      {/* Header */}
      <div className="border-b border-border-subtle bg-surface-secondary/50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-text-primary">
              Check Your Chances
            </h1>
          </div>
          <p className="text-text-secondary">
            See how you stack up against your target schools
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* School Search */}
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
              placeholder="Search for a school..."
              className={cn(
                "w-full pl-12 pr-4 py-4 rounded-xl",
                "bg-surface-secondary border border-border-subtle",
                "text-text-primary placeholder:text-text-muted",
                "focus:outline-none focus:ring-2 focus:ring-accent-primary/30 focus:border-accent-primary",
                "transition-all"
              )}
            />
            {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted animate-spin" />
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

        {/* Selected School Card */}
        {selectedSchool && (
          <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <SchoolLogo name={selectedSchool.name} size="lg" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-text-primary">
                  {selectedSchool.name}
                </h2>
                <p className="text-text-secondary">
                  {selectedSchool.city}, {selectedSchool.state}
                  {selectedSchool.type && ` • ${selectedSchool.type}`}
                </p>
                
                {/* School Stats */}
                <div className="flex flex-wrap gap-4 mt-4">
                  {selectedSchool.acceptanceRate && (
                    <div className="text-sm">
                      <span className="text-text-muted">Acceptance Rate</span>
                      <div className="font-semibold text-text-primary">
                        {(selectedSchool.acceptanceRate * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                  {selectedSchool.satRange25 && selectedSchool.satRange75 && (
                    <div className="text-sm">
                      <span className="text-text-muted">SAT Range</span>
                      <div className="font-semibold text-text-primary">
                        {selectedSchool.satRange25}-{selectedSchool.satRange75}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Mode Selection */}
            <div className="flex gap-2 mt-6 mb-4">
              <button
                onClick={() => setMode("current")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  mode === "current"
                    ? "bg-accent-primary text-white"
                    : "bg-surface-tertiary text-text-secondary hover:text-text-primary"
                )}
              >
                Current Profile
              </button>
              <button
                onClick={() => setMode("projected")}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  mode === "projected"
                    ? "bg-accent-primary text-white"
                    : "bg-surface-tertiary text-text-secondary hover:text-text-primary"
                )}
              >
                With Goals
              </button>
            </div>
            
            {/* Calculate Button */}
            {!chancesResult && (
              <Button
                onClick={handleCalculateChances}
                disabled={isCalculating}
                className="w-full mt-4"
                size="lg"
              >
                {isCalculating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {calculationProgress}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Check My Chances
                  </>
                )}
              </Button>
            )}
            
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {chancesResult && (
          <div className="space-y-6">
            {/* Main Probability */}
            <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-8 text-center">
              <div className="text-6xl font-bold text-accent-primary mb-2">
                {chancesResult.probability}%
              </div>
              <div className={cn(
                "inline-block px-3 py-1 rounded-full text-sm font-medium mb-4",
                chancesResult.tier === "safety" && "bg-green-500/20 text-green-400",
                chancesResult.tier === "likely" && "bg-emerald-500/20 text-emerald-400",
                chancesResult.tier === "target" && "bg-yellow-500/20 text-yellow-400",
                chancesResult.tier === "reach" && "bg-orange-500/20 text-orange-400",
                chancesResult.tier === "unlikely" && "bg-red-500/20 text-red-400"
              )}>
                {chancesResult.tier.charAt(0).toUpperCase() + chancesResult.tier.slice(1)}
              </div>
              
              <p className="text-text-secondary max-w-xl mx-auto">
                {chancesResult.summary}
              </p>
              
              {/* Recalculate Button */}
              <Button
                onClick={handleCalculateChances}
                variant="secondary"
                className="mt-6"
              >
                Recalculate
              </Button>
            </div>

            {/* Factor Breakdown */}
            <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-accent-primary" />
                <h3 className="text-lg font-semibold text-text-primary">
                  Factor Breakdown
                </h3>
              </div>
              
              <div className="space-y-4">
                <FactorBar 
                  label="Academics" 
                  score={chancesResult.factors.academics.score}
                  impact={chancesResult.factors.academics.impact}
                  details={chancesResult.factors.academics.details}
                />
                <FactorBar 
                  label="Testing" 
                  score={chancesResult.factors.testing.score}
                  impact={chancesResult.factors.testing.impact}
                  details={chancesResult.factors.testing.details}
                />
                <FactorBar 
                  label="Activities" 
                  score={chancesResult.factors.activities.score}
                  impact={chancesResult.factors.activities.impact}
                  details={chancesResult.factors.activities.details}
                />
                <FactorBar 
                  label="Awards" 
                  score={chancesResult.factors.awards.score}
                  impact={chancesResult.factors.awards.impact}
                  details={chancesResult.factors.awards.details}
                />
              </div>
            </div>

            {/* Improvements */}
            {chancesResult.improvements.length > 0 && (
              <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Lightbulb className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-text-primary">
                    What Could Help
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {chancesResult.improvements.map((improvement, index) => (
                    <div 
                      key={index}
                      className="flex items-start gap-3 p-3 bg-surface-tertiary rounded-xl"
                    >
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-2",
                        improvement.priority === "high" && "bg-accent-primary",
                        improvement.priority === "medium" && "bg-yellow-400",
                        improvement.priority === "low" && "bg-text-muted"
                      )} />
                      <div className="flex-1">
                        <div className="text-text-primary">{improvement.action}</div>
                        <div className="text-sm text-accent-primary">
                          {improvement.potentialImpact}
                        </div>
                      </div>
                      <div className="text-xs text-text-muted uppercase">
                        {improvement.category}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulation Toggle */}
            <button
              onClick={() => setShowSimulation(!showSimulation)}
              className="w-full flex items-center justify-between p-4 bg-surface-secondary border border-border-subtle rounded-xl hover:bg-surface-tertiary transition-colors"
            >
              <span className="font-medium text-text-primary">
                Simulation Mode
              </span>
              {showSimulation ? (
                <ChevronUp className="w-5 h-5 text-text-muted" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted" />
              )}
            </button>
            
            {showSimulation && (
              <div className="bg-surface-secondary border border-border-subtle rounded-2xl p-6">
                <p className="text-text-secondary text-center py-8">
                  Simulation mode coming soon - toggle achievements and goals to see their impact.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!selectedSchool && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-secondary flex items-center justify-center">
              <Search className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              Search for a School
            </h3>
            <p className="text-text-secondary max-w-md mx-auto">
              Enter the name of any college or university to see your estimated chances of admission.
            </p>
          </div>
        )}
      </div>
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
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case "neutral":
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case "negative":
      case "strong_negative":
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getImpactIcon(impact)}
          <span className="font-medium text-text-primary">{label}</span>
        </div>
        <span className="text-sm text-text-muted">{score}/100</span>
      </div>
      <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden mb-2">
        <div 
          className={cn("h-full rounded-full transition-all", getImpactColor(impact))}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-sm text-text-secondary">{details}</p>
    </div>
  );
}

