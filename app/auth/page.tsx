"use client";

import React, { useState, useRef, useEffect } from "react";
import { ArrowRight, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"start" | "code">("start");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);

  // DEV: Show code in console for testing
  const [devCode, setDevCode] = useState<string | null>(null);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus code input when step changes to code
  useEffect(() => {
    if (step === "code" && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send code");
      }

      setIsNewUser(data.isNewUser);
      setStep("code");

      // DEV: Store code for easy testing
      if (data.devCode) {
        setDevCode(data.devCode);
        console.log("[DEV] Verification code:", data.devCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid code");
      }

      // Success! Redirect based on whether it's a new user
      router.push(data.redirectTo || redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      // DEV: Store code for easy testing
      if (data.devCode) {
        setDevCode(data.devCode);
        console.log("[DEV] New verification code:", data.devCode);
      }

      setError(null);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Column: Marketing (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 bg-[#F7F5F0] relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#E8F5F3_0%,transparent_60%)]" />

        <div className="relative z-10 max-w-lg">
          <div className="w-12 h-12 bg-text-main text-white rounded-xl flex items-center justify-center font-bold text-2xl mb-8">
            S3
          </div>

          <h1 className="font-display font-bold text-5xl mb-6 leading-tight text-text-main">
            College prep,
            <br />
            reimagined.
          </h1>
          <p className="text-xl text-text-muted mb-10 leading-relaxed">
            Stop juggling spreadsheets and deadlines. Let your personal AI
            advisor guide you from 9th grade to acceptance letter.
          </p>

          <div className="space-y-4">
            <FeatureItem text="Personalized admission chances" />
            <FeatureItem text="Daily focused action plan" />
            <FeatureItem text="Zero-anxiety portfolio builder" />
          </div>
        </div>
      </div>

      {/* Right Column: Action */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-8 md:px-24">
        <div className="max-w-md w-full mx-auto">
          {step === "start" ? (
            <>
              <div className="mb-10">
                <h2 className="font-display font-bold text-3xl mb-2">
                  Get Started
                </h2>
                <p className="text-text-muted">
                  Enter your email to sign in or create an account.
                </p>
              </div>

              <button className="w-full flex items-center justify-center gap-3 bg-white border border-border-medium hover:bg-bg-sidebar py-3.5 rounded-xl font-medium text-text-main transition-colors mb-6 shadow-sm hover:shadow-md">
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  className="w-5 h-5"
                  alt="Google"
                />
                Continue with Google
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-border-subtle flex-1"></div>
                <span className="text-xs text-text-light font-medium uppercase tracking-wider">
                  Or
                </span>
                <div className="h-px bg-border-subtle flex-1"></div>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5 ml-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-bg-app border border-border-medium rounded-xl px-4 py-3.5 text-base outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-surface transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">
                    {error}
                  </p>
                )}

                <Button
                  className="w-full justify-center h-12 text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    <>
                      Continue with Email
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <form
              onSubmit={handleCodeSubmit}
              className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-300"
            >
              <button
                type="button"
                onClick={() => {
                  setStep("start");
                  setCode("");
                  setError(null);
                  setDevCode(null);
                }}
                className="text-sm text-text-muted hover:text-text-main flex items-center gap-1 mb-2"
              >
                <ArrowRight className="w-4 h-4 rotate-180" /> Back
              </button>

              <div className="text-center">
                <div className="w-16 h-16 bg-accent-surface text-accent-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-2xl mb-2">Check your inbox</h3>
                <p className="text-text-muted">
                  We sent a 6-digit code to
                  <br />
                  <span className="font-semibold text-text-main">{email}</span>
                </p>
              </div>

              <div>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full bg-bg-app border border-border-medium rounded-xl px-4 py-4 text-center text-3xl font-mono font-bold tracking-[0.5em] outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-surface transition-all"
                  disabled={isLoading}
                />
              </div>

              {/* DEV: Show code for testing */}
              {devCode && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm">
                  <span className="font-medium text-yellow-800">
                    DEV MODE:
                  </span>{" "}
                  <span className="font-mono text-yellow-900">{devCode}</span>
                </div>
              )}

              {error && (
                <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg text-center">
                  {error}
                </p>
              )}

              <Button
                className="w-full justify-center h-12 text-base"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <p className="text-center text-sm text-text-muted">
                Didn't receive the code?{" "}
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-accent-primary hover:underline font-medium"
                  disabled={isLoading}
                >
                  Resend
                </button>
              </p>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-text-light">
            By continuing, you agree to our{" "}
            <a href="https://sesame3.com/terms" className="underline hover:text-text-muted">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="https://sesame3.com/privacy" className="underline hover:text-text-muted">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-accent-primary shadow-sm">
        <CheckCircle2 className="w-4 h-4" />
      </div>
      <span className="font-medium text-text-main">{text}</span>
    </div>
  );
}
