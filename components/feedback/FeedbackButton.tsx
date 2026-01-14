"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, X, Send, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePostHog } from "@/lib/context/PostHogContext";
import { trackEvent } from "@/lib/context/PostHogContext";
import posthog from "posthog-js";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isReady } = usePostHog();

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      // Small delay to ensure modal animation completes
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset state when closing
  const handleClose = () => {
    setIsOpen(false);
    // Only reset if not in success state (let user see success before closing)
    if (submitState !== "success") {
      setContent("");
      setSubmitState("idle");
      setErrorMessage("");
    }
  };

  // Reset after success
  useEffect(() => {
    if (submitState === "success") {
      const timer = setTimeout(() => {
        setIsOpen(false);
        setContent("");
        setSubmitState("idle");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [submitState]);

  // Handle submit
  const handleSubmit = async () => {
    if (!content.trim() || submitState === "submitting") return;

    setSubmitState("submitting");
    setErrorMessage("");

    try {
      // Get PostHog session ID if available
      let posthogSessionId: string | undefined;
      if (isReady && posthog.__loaded) {
        posthogSessionId = posthog.get_session_id() || undefined;
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          pageUrl: window.location.href,
          posthogSessionId,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      // Track the event
      trackEvent("feedback_submitted", {
        content_length: content.trim().length,
        page_url: window.location.pathname,
      });

      setSubmitState("success");
    } catch (error) {
      console.error("[Feedback] Submit error:", error);
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
      setSubmitState("error");
    }
  };

  // Handle keyboard submit (Cmd/Ctrl + Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed z-40 p-3 rounded-full shadow-lg transition-all duration-200",
          "bg-text-main text-white hover:bg-text-main/90 hover:scale-105",
          "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2",
          // Desktop: bottom-right
          "right-6 bottom-6",
          // Mobile: above bottom nav (which is ~80px high)
          "md:right-6 md:bottom-6",
          "max-md:right-4 max-md:bottom-24"
        )}
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          {/* Modal Content */}
          <div
            className={cn(
              "w-full bg-white shadow-float overflow-hidden animate-in duration-200",
              // Desktop: centered with max-width and rounded corners
              "md:max-w-md md:rounded-2xl md:zoom-in-95 md:slide-in-from-bottom-4",
              // Mobile: full-width bottom sheet with top rounded corners
              "max-md:rounded-t-2xl max-md:slide-in-from-bottom"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <h2 className="font-display font-semibold text-lg text-text-main">
                Send Feedback
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 -m-1.5 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              {submitState === "success" ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-text-main font-medium">Thanks for your feedback!</p>
                  <p className="text-text-muted text-sm mt-1">We&apos;ll look into it.</p>
                </div>
              ) : (
                <>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tell us what's on your mind... Bug reports, feature ideas, or anything else."
                    className={cn(
                      "w-full min-h-[140px] p-3 rounded-xl border resize-none",
                      "text-text-main placeholder:text-text-muted/60",
                      "focus:outline-none focus:ring-2 focus:ring-accent-primary/20 focus:border-accent-primary",
                      "transition-colors",
                      submitState === "error" ? "border-red-300" : "border-border-subtle"
                    )}
                    disabled={submitState === "submitting"}
                    maxLength={10000}
                  />

                  {/* Error message */}
                  {submitState === "error" && errorMessage && (
                    <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-text-muted">
                      {content.length > 0 && `${content.length.toLocaleString()} characters`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted hidden sm:inline">
                        {navigator.platform.includes("Mac") ? "Cmd" : "Ctrl"}+Enter to send
                      </span>
                      <button
                        onClick={handleSubmit}
                        disabled={!content.trim() || submitState === "submitting"}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                          "bg-text-main text-white",
                          "hover:bg-text-main/90",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          "focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2"
                        )}
                      >
                        {submitState === "submitting" ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-safe md:hidden" />
          </div>
        </div>
      )}
    </>
  );
}
