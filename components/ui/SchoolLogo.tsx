"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface SchoolLogoProps {
  name: string;
  shortName?: string | null;
  websiteUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * SchoolLogo - Displays school logo from Logo.dev with initial fallback
 * 
 * Uses the school's website domain to fetch the logo.
 * Falls back to initials if logo fails to load or no URL is available.
 * 
 * Requires NEXT_PUBLIC_LOGO_DEV_TOKEN in environment.
 */
export function SchoolLogo({ 
  name, 
  shortName, 
  websiteUrl, 
  size = "md",
  className,
}: SchoolLogoProps) {
  const [imgError, setImgError] = useState(false);
  
  const logoDevToken = process.env.NEXT_PUBLIC_LOGO_DEV_TOKEN;
  
  // Extract domain from URL
  const domain = websiteUrl ? extractDomain(websiteUrl) : null;
  
  // Build logo URL
  const logoUrl = domain && logoDevToken && !imgError
    ? `https://img.logo.dev/${domain}?token=${logoDevToken}&size=64`
    : null;
  
  // Get initials for fallback
  const initials = getInitials(shortName || name);
  
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  
  if (logoUrl) {
    return (
      <div className={cn(
        "relative rounded-lg overflow-hidden bg-white border border-border-subtle flex items-center justify-center",
        sizeClasses[size],
        className
      )}>
        <img
          src={logoUrl}
          alt={`${name} logo`}
          className="w-full h-full object-contain p-1"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    );
  }
  
  // Fallback to initials
  return (
    <div className={cn(
      "rounded-lg bg-accent-surface flex items-center justify-center font-bold text-accent-primary",
      sizeClasses[size],
      className
    )}>
      {initials}
    </div>
  );
}

function extractDomain(url: string): string | null {
  try {
    // Handle URLs without protocol
    const urlWithProtocol = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(urlWithProtocol);
    return parsed.hostname.replace("www.", "");
  } catch {
    return null;
  }
}

function getInitials(name: string): string {
  // Handle abbreviations like MIT, UCLA
  if (name.length <= 4 && name === name.toUpperCase()) {
    return name;
  }
  
  // Get first letter of first 2 words
  const words = name.split(/\s+/).filter(w => 
    !["of", "the", "at", "in", "and", "for"].includes(w.toLowerCase())
  );
  
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }
  
  return words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join("");
}

