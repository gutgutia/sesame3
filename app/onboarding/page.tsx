"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, GraduationCap, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type AccountType = "student" | "parent";
type Grade = "9th" | "10th" | "11th" | "12th";

interface OnboardingData {
  accountType: AccountType | null;
  firstName: string;
  grade: Grade | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    accountType: null,
    firstName: "",
    grade: null,
  });

  const totalSteps = 3;

  const canProceed = () => {
    switch (step) {
      case 1:
        return data.accountType !== null;
      case 2:
        return data.firstName.trim().length > 0;
      case 3:
        return data.grade !== null;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canProceed()) return;

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Final step - submit and redirect
      await handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Update profile with collected data
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountType: data.accountType,
          firstName: data.firstName.trim(),
          grade: data.grade,
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save profile");
      }

      // Redirect to dashboard
      router.push("/dashboard?new=true");
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && canProceed()) {
      handleNext();
    }
  };

  return (
    <div className="min-h-screen bg-bg-app relative overflow-hidden">
      {/* Blurred background - simulated dashboard */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-bg-app">
          {/* Sidebar placeholder */}
          <div className="hidden md:block absolute left-0 top-0 bottom-0 w-64 bg-bg-sidebar border-r border-border-subtle">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 bg-border-medium rounded-lg" />
                <div className="w-20 h-4 bg-border-medium rounded" />
              </div>
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-border-subtle rounded" />
                    <div className="w-24 h-3 bg-border-subtle rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main content placeholder */}
          <div className="md:ml-64 p-8">
            <div className="max-w-4xl">
              <div className="w-48 h-8 bg-border-medium rounded mb-2" />
              <div className="w-64 h-4 bg-border-subtle rounded mb-8" />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-border-subtle rounded-2xl p-6"
                  >
                    <div className="w-10 h-10 bg-border-subtle rounded-xl mb-4" />
                    <div className="w-32 h-4 bg-border-medium rounded mb-2" />
                    <div className="w-full h-3 bg-border-subtle rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Blur overlay */}
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md" />
      </div>

      {/* Onboarding modal */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div
          className="w-full max-w-md bg-white rounded-2xl shadow-float overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onKeyDown={handleKeyDown}
        >
          {/* Header with logo */}
          <div className="p-6 pb-0">
            <div className="flex items-center gap-3 mb-6">
              <img
                src="/brand/sesame3-mark.svg"
                alt="Sesame3"
                className="w-10 h-10"
              />
              <span className="font-display font-bold text-xl text-text-main">
                sesame3
              </span>
            </div>

            {/* Progress indicator */}
            <div className="flex gap-2 mb-6">
              {[...Array(totalSteps)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors duration-300",
                    i + 1 <= step ? "bg-accent-primary" : "bg-border-subtle"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 pt-2">
            {/* Step 1: Account Type */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="font-display font-bold text-2xl text-text-main mb-2">
                  Who's creating this account?
                </h2>
                <p className="text-text-muted mb-6">
                  This helps us personalize your experience.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() =>
                      setData({ ...data, accountType: "student" })
                    }
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200",
                      data.accountType === "student"
                        ? "border-accent-primary bg-accent-surface"
                        : "border-border-medium bg-white hover:border-text-light hover:bg-bg-sidebar"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                        data.accountType === "student"
                          ? "bg-accent-primary text-white"
                          : "bg-bg-sidebar text-text-muted"
                      )}
                    >
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-text-main">
                        I'm the student
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setData({ ...data, accountType: "parent" })}
                    className={cn(
                      "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200",
                      data.accountType === "parent"
                        ? "border-accent-primary bg-accent-surface"
                        : "border-border-medium bg-white hover:border-text-light hover:bg-bg-sidebar"
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
                        data.accountType === "parent"
                          ? "bg-accent-primary text-white"
                          : "bg-bg-sidebar text-text-muted"
                      )}
                    >
                      <User className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-text-main">
                        I'm a parent
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Name */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="font-display font-bold text-2xl text-text-main mb-2">
                  {data.accountType === "parent"
                    ? "What's your student's name?"
                    : "What should we call you?"}
                </h2>
                <p className="text-text-muted mb-6">
                  {data.accountType === "parent"
                    ? "We'll use this to personalize their experience."
                    : "We'll use this throughout the app."}
                </p>

                <Input
                  placeholder="First name"
                  value={data.firstName}
                  onChange={(e) =>
                    setData({ ...data, firstName: e.target.value })
                  }
                  autoFocus
                  className="text-lg"
                />
              </div>
            )}

            {/* Step 3: Grade */}
            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <h2 className="font-display font-bold text-2xl text-text-main mb-2">
                  {data.accountType === "parent"
                    ? `What grade is ${data.firstName || "your student"} in?`
                    : "What grade are you in?"}
                </h2>
                <p className="text-text-muted mb-6">
                  This helps us tailor advice and deadlines.
                </p>

                <div className="grid grid-cols-4 gap-2">
                  {(["9th", "10th", "11th", "12th"] as Grade[]).map((grade) => (
                    <button
                      key={grade}
                      onClick={() => setData({ ...data, grade })}
                      className={cn(
                        "flex flex-col items-center justify-center py-4 px-3 rounded-xl border-2 transition-all duration-200",
                        data.grade === grade
                          ? "border-accent-primary bg-accent-surface"
                          : "border-border-medium bg-white hover:border-text-light hover:bg-bg-sidebar"
                      )}
                    >
                      <GraduationCap
                        className={cn(
                          "w-5 h-5 mb-1",
                          data.grade === grade
                            ? "text-accent-primary"
                            : "text-text-muted"
                        )}
                      />
                      <span
                        className={cn(
                          "font-semibold",
                          data.grade === grade
                            ? "text-accent-primary"
                            : "text-text-main"
                        )}
                      >
                        {grade}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-8">
              {step > 1 && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={handleBack}
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={handleNext}
                disabled={!canProceed() || isSubmitting}
                className={cn("flex-1", step === 1 && "w-full")}
              >
                {isSubmitting ? (
                  "Setting up..."
                ) : step === totalSteps ? (
                  <>
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6">
            <div className="flex items-center justify-center gap-2 text-text-light text-sm">
              <Sparkles className="w-4 h-4" />
              <span>College prep, without the panic.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
