"use client";

import { ArrowRight } from "lucide-react";

export function CTA() {
  return (
    <section className="py-16 md:py-24 bg-[var(--bg-page)]">
      <div className="container px-4">
        <div className="relative bg-gradient-to-br from-[var(--text-main)] to-[#1a1a1a] rounded-3xl md:rounded-[32px] px-6 md:px-10 py-12 md:py-20 text-center overflow-hidden">
          {/* Glow effects */}
          <div className="absolute w-[500px] h-[500px] bg-[var(--accent-primary)] opacity-15 blur-3xl rounded-full -top-[200px] -left-[100px]" />
          <div className="absolute w-[500px] h-[500px] bg-[var(--accent-primary)] opacity-15 blur-3xl rounded-full -bottom-[200px] -right-[100px]" />

          <h2 className="font-['Satoshi'] text-4xl md:text-5xl font-bold text-white mb-5 relative">
            Ready to start your journey?
          </h2>
          <p className="text-lg text-white/70 max-w-md mx-auto mb-10 relative">
            Join thousands of students getting expert guidance on their path to college.
          </p>

          <div className="flex justify-center gap-4 relative">
            <a
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[var(--text-main)] font-semibold rounded-full hover:bg-[var(--bg-secondary)] transition-all"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
