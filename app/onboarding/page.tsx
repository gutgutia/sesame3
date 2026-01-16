"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function OnboardingPage() {
  const router = useRouter();
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const welcomeFetched = useRef(false);

  // Fetch personalized welcome message on mount
  // Use ref to prevent duplicate calls (React Strict Mode runs useEffect twice)
  useEffect(() => {
    if (welcomeFetched.current) return;
    welcomeFetched.current = true;

    const fetchWelcome = async () => {
      try {
        const response = await fetch("/api/chat/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "onboarding" }),
        });
        if (response.ok) {
          const data = await response.json();
          setWelcomeMessage(data.message);
        }
      } catch (error) {
        console.error("Failed to fetch welcome message:", error);
        // Use a default onboarding welcome if fetch fails
        setWelcomeMessage("Hi! I'm Sesame3, your college prep guide. I'm here to help you navigate the college journey calmly — one step at a time. First things first: what should I call you?");
      }
    };

    fetchWelcome();
  }, []);

  // Handle completing onboarding
  const handleComplete = async () => {
    if (isCompleting) return;
    setIsCompleting(true);

    try {
      // Mark onboarding as complete
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });

      // Redirect to dashboard
      router.push("/dashboard?new=true");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsCompleting(false);
    }
  };

  return (
    <div className="h-screen bg-bg-app flex overflow-hidden">
      {/* Left: Brand Anchor - fixed sidebar */}
      <div className="hidden md:flex w-[400px] bg-bg-sidebar border-r border-border-subtle flex-col justify-between p-10 flex-shrink-0">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <img
              src="/brand/sesame3-mark.svg"
              alt="Sesame3"
              className="w-10 h-10"
            />
            <span className="font-display font-bold text-xl text-text-main">sesame3</span>
          </div>

          {/* Tagline */}
          <h1 className="font-display font-bold text-3xl text-text-main leading-tight mb-4">
            College prep,<br />without the panic.
          </h1>
          <p className="text-text-muted leading-relaxed">
            A calm, organized space to plan your journey — one step at a time.
          </p>
        </div>

        {/* Bottom decorative element */}
        <div className="flex items-center gap-2 text-text-light text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Powered by AI that gets it.</span>
        </div>
      </div>

      {/* Right: Chat Interface - takes remaining space, internal scroll */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-bg-sidebar border-b border-border-subtle flex items-center px-4 gap-3 flex-shrink-0">
          <img
            src="/brand/sesame3-mark.svg"
            alt="Sesame3"
            className="w-8 h-8"
          />
          <span className="font-display font-bold text-lg">sesame3</span>
        </div>

        {/* Chat Area - constrained width for readability */}
        <div className="flex-1 flex flex-col items-center overflow-hidden">
          <div className="w-full max-w-3xl flex-1 flex flex-col overflow-hidden">
            <ChatInterface
              mode="onboarding"
              preloadedWelcome={welcomeMessage}
            />
          </div>
        </div>

        {/* "I'm Done" Button */}
        <div className="p-4 border-t border-border-subtle bg-white flex-shrink-0">
          <div className="max-w-3xl mx-auto flex justify-center">
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-text-muted hover:text-accent-primary hover:bg-accent-surface rounded-lg transition-all disabled:opacity-50"
            >
              {isCompleting ? (
                "Setting up your workspace..."
              ) : (
                <>
                  I'm done, take me to my dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
