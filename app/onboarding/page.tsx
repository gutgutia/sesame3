"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { ChatInterface } from "@/components/chat/ChatInterface";

export default function OnboardingPage() {
  const router = useRouter();
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  // Fetch personalized welcome message on mount
  useEffect(() => {
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
        setWelcomeMessage("Hi! I'm Sesame, your college prep guide. I'm here to help you navigate the college journey calmly — one step at a time. First things first: what should I call you?");
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
      router.push("/?new=true");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      setIsCompleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app flex">
      {/* Left: Brand Anchor */}
      <div className="hidden md:flex w-[400px] bg-bg-sidebar border-r border-border-subtle flex-col justify-between p-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-text-main text-white rounded-xl flex items-center justify-center font-bold text-sm">
              S3
            </div>
            <span className="font-display font-bold text-xl text-text-main">Sesame</span>
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

      {/* Right: Chat Interface */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-bg-sidebar border-b border-border-subtle flex items-center px-4 gap-3">
          <div className="w-8 h-8 bg-text-main text-white rounded-lg flex items-center justify-center font-bold text-xs">
            S3
          </div>
          <span className="font-display font-bold text-lg">Sesame</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatInterface
            mode="onboarding"
            preloadedWelcome={welcomeMessage}
          />
        </div>

        {/* "I'm Done" Button */}
        <div className="p-4 border-t border-border-subtle bg-white">
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
