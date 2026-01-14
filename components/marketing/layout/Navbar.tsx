"use client";

import { Button } from "../Button";
import { Logo } from "../Logo";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 py-4 md:py-5 bg-[var(--bg-page)]/85 backdrop-blur-md border-b border-black/5">
      <div className="container flex justify-between items-center px-4">
        <a href="/">
          <Logo size="md" />
        </a>
        
        <div className="hidden md:flex items-center gap-8">
          <a href="/#how" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            How It Works
          </a>
          <a href="/#features" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            Features
          </a>
          <a href="/#pricing" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            Pricing
          </a>
          <a href="/about" className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            About
          </a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" href="/login">Sign In</Button>
          <Button variant="primary" size="sm" href="/login">Get Started</Button>
        </div>
      </div>
    </nav>
  );
}
