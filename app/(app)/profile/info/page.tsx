"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  ChevronLeft,
  Save,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useProfile } from "@/lib/context/ProfileContext";

const GRADE_OPTIONS = ["9th", "10th", "11th", "12th"];

const RESIDENCY_OPTIONS = [
  { value: "us_citizen", label: "U.S. Citizen" },
  { value: "us_permanent_resident", label: "U.S. Permanent Resident" },
  { value: "international", label: "International Student" },
];

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export default function AboutMeInfoPage() {
  const { profile, isLoading, error, refreshProfile } = useProfile();

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [grade, setGrade] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [highSchoolName, setHighSchoolName] = useState("");
  const [highSchoolCity, setHighSchoolCity] = useState("");
  const [highSchoolState, setHighSchoolState] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [residencyStatus, setResidencyStatus] = useState("");

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with profile data
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setGrade(profile.grade || "");
      setGraduationYear(profile.graduationYear?.toString() || "");
      setHighSchoolName(profile.highSchoolName || "");
      setHighSchoolCity(profile.highSchoolCity || "");
      setHighSchoolState(profile.highSchoolState || "");
      setBirthDate(profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : "");
      setResidencyStatus(profile.residencyStatus || "");
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (!profile) return;

    const changed =
      firstName !== (profile.firstName || "") ||
      lastName !== (profile.lastName || "") ||
      grade !== (profile.grade || "") ||
      graduationYear !== (profile.graduationYear?.toString() || "") ||
      highSchoolName !== (profile.highSchoolName || "") ||
      highSchoolCity !== (profile.highSchoolCity || "") ||
      highSchoolState !== (profile.highSchoolState || "") ||
      birthDate !== (profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : "") ||
      residencyStatus !== (profile.residencyStatus || "");

    setHasChanges(changed);
  }, [profile, firstName, lastName, grade, graduationYear, highSchoolName, highSchoolCity, highSchoolState, birthDate, residencyStatus]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          grade,
          graduationYear: graduationYear ? parseInt(graduationYear) : null,
          highSchoolName,
          highSchoolCity,
          highSchoolState,
          birthDate: birthDate || null,
          residencyStatus: residencyStatus || null,
        }),
      });

      if (res.ok) {
        await refreshProfile();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        alert("Failed to save changes");
      }
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
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

  // Calculate current year for graduation year options
  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 6 }, (_, i) => currentYear + i);

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
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl text-text-main">About Me</h1>
              <p className="text-text-muted">Your basic information</p>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : showSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {showSuccess ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl space-y-8">
        {/* Personal Information */}
        <section className="bg-white border border-border-subtle rounded-[20px] p-6 shadow-card">
          <h2 className="font-display font-bold text-lg text-text-main mb-4">Personal Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                First Name
              </label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Last Name
              </label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Date of Birth
              </label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Residency Status
              </label>
              <select
                value={residencyStatus}
                onChange={(e) => setResidencyStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border-medium rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              >
                <option value="">Select status</option>
                {RESIDENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* School Information */}
        <section className="bg-white border border-border-subtle rounded-[20px] p-6 shadow-card">
          <h2 className="font-display font-bold text-lg text-text-main mb-4">School Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Current Grade
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full px-3 py-2 border border-border-medium rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              >
                <option value="">Select grade</option>
                {GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                Graduation Year
              </label>
              <select
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="w-full px-3 py-2 border border-border-medium rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              >
                <option value="">Select year</option>
                {graduationYears.map((year) => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-main mb-1.5">
                High School Name
              </label>
              <Input
                value={highSchoolName}
                onChange={(e) => setHighSchoolName(e.target.value)}
                placeholder="Enter your high school name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                City
              </label>
              <Input
                value={highSchoolCity}
                onChange={(e) => setHighSchoolCity(e.target.value)}
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-main mb-1.5">
                State
              </label>
              <select
                value={highSchoolState}
                onChange={(e) => setHighSchoolState(e.target.value)}
                className="w-full px-3 py-2 border border-border-medium rounded-lg bg-white text-text-main focus:outline-none focus:ring-2 focus:ring-accent-primary focus:border-transparent"
              >
                <option value="">Select state</option>
                {US_STATES.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
