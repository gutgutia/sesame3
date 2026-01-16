"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";

export function Hero() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    // Check auth status via API (cookie is httpOnly so can't read directly)
    fetch("/api/user/me")
      .then((res) => setIsSignedIn(res.ok))
      .catch(() => setIsSignedIn(false));
  }, []);

  return (
    <header className="pt-28 md:pt-40 pb-16 md:pb-24 text-center">
      <div className="container px-4">
        {/* Title */}
        <h1 className="font-['Satoshi'] text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-5 md:mb-6 max-w-3xl mx-auto leading-tight">
          Your personal advisor for the{" "}
          <span className="text-[var(--accent-primary)]">college journey</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-xl text-[var(--text-muted)] max-w-xl mx-auto mb-8 md:mb-10 leading-relaxed">
          Expert guidance, honest chance assessments, and a clear roadmap — all through a conversation with an AI that knows you.
        </p>

        {/* CTA Button */}
        <div className="flex justify-center gap-4 mb-12 md:mb-16">
          <a
            href={isSignedIn ? "/dashboard" : "/login"}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--text-main)] text-white font-semibold rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            {isSignedIn ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Screenshot */}
        <div className="max-w-[1000px] mx-auto">
          <div
            className="rounded-2xl overflow-hidden bg-white"
            style={{
              boxShadow: "0 40px 100px -30px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)"
            }}
          >
            <img
              src="/assets/hero-screenshot.png"
              alt="Sesame3 app interface showing college counseling chat"
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
