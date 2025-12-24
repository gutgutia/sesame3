"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, FileText, Loader2, Sparkles, ArrowLeft } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { QUICK_NOTE_PLACEHOLDER } from "@/lib/prompts";

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStorySaved: () => void;
}

type Mode = "conversation" | "note";
type Step = "input" | "synthesizing" | "preview";

interface SynthesizedStory {
  title: string;
  summary: string;
  themes: string[];
}

export function ShareStoryModal({ isOpen, onClose, onStorySaved }: ShareStoryModalProps) {
  const [mode, setMode] = useState<Mode>("conversation");
  const [step, setStep] = useState<Step>("input");
  const [noteContent, setNoteContent] = useState("");
  const [synthesized, setSynthesized] = useState<SynthesizedStory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [initialMessageLoaded, setInitialMessageLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Chat hook for conversation mode
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/profile/stories/chat",
    onFinish: () => {
      scrollToBottom();
    },
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load initial message for conversation mode
  useEffect(() => {
    if (isOpen && mode === "conversation" && !initialMessageLoaded && messages.length === 0) {
      // Add the opener message directly
      setMessages([{ 
        id: "initial", 
        role: "assistant", 
        content: "I'd love to learn more about you beyond grades and test scores.\n\nWhat's something you're passionate about, or an experience that shaped who you are? It could be anything - big or small.",
      }]);
      setInitialMessageLoaded(true);
    }
  }, [isOpen, mode, initialMessageLoaded, messages.length, setMessages]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setMode("conversation");
      setStep("input");
      setNoteContent("");
      setSynthesized(null);
      setMessages([]);
      setInitialMessageLoaded(false);
    }
  }, [isOpen, setMessages]);

  // Focus input when switching modes
  useEffect(() => {
    if (isOpen && mode === "note" && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, mode]);

  // Build raw content from conversation or note
  const buildRawContent = (): string => {
    if (mode === "conversation") {
      return messages
        .map((m) => `${m.role === "user" ? "Student" : "Counselor"}: ${m.content}`)
        .join("\n\n");
    }
    return noteContent;
  };

  // Synthesize the story
  const handleSynthesize = async () => {
    const rawContent = buildRawContent();
    if (!rawContent.trim()) return;

    setStep("synthesizing");
    setIsSynthesizing(true);

    try {
      const res = await fetch("/api/profile/stories/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawContent,
          contentType: mode,
        }),
      });

      if (!res.ok) throw new Error("Failed to synthesize");

      const data = await res.json();
      setSynthesized(data);
      setStep("preview");
    } catch (error) {
      console.error("Synthesis error:", error);
      // Fallback to preview with manual entry
      setSynthesized({ title: "", summary: "", themes: [] });
      setStep("preview");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Save the story
  const handleSave = async () => {
    if (!synthesized) return;

    setIsSaving(true);

    try {
      const res = await fetch("/api/profile/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: synthesized.title,
          summary: synthesized.summary,
          themes: synthesized.themes,
          rawContent: buildRawContent(),
          contentType: mode,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      onStorySaved();
      onClose();
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if ready to synthesize
  const canSynthesize = mode === "conversation" 
    ? messages.filter((m) => m.role === "user").length >= 2
    : noteContent.trim().length > 50;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl h-[80vh] max-h-[700px] bg-white rounded-2xl shadow-float overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {step === "preview" && (
              <button
                onClick={() => setStep("input")}
                className="p-2 -m-2 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="font-display font-bold text-lg text-text-main">
                {step === "preview" ? "Review Your Story" : "Share Your Story"}
              </h2>
              <p className="text-sm text-text-muted">
                {step === "preview"
                  ? "Review and save your story"
                  : mode === "conversation"
                    ? "Let's have a conversation about you"
                    : "Write a quick note about yourself"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle (only in input step) */}
        {step === "input" && (
          <div className="flex justify-center p-3 border-b border-border-subtle bg-bg-sidebar/50">
            <div className="inline-flex rounded-lg border border-border-subtle bg-white p-1">
              <button
                onClick={() => setMode("conversation")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                  mode === "conversation"
                    ? "bg-text-main text-white shadow-sm"
                    : "text-text-muted hover:text-text-main"
                )}
              >
                <MessageCircle className="w-4 h-4" />
                Conversation
              </button>
              <button
                onClick={() => setMode("note")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all",
                  mode === "note"
                    ? "bg-text-main text-white shadow-sm"
                    : "text-text-muted hover:text-text-main"
                )}
              >
                <FileText className="w-4 h-4" />
                Quick Note
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Synthesizing State */}
          {step === "synthesizing" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-accent-surface flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-accent-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium text-text-main">Synthesizing your story...</p>
                <p className="text-sm text-text-muted mt-1">Creating title, summary, and themes</p>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && synthesized && (
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Title</label>
                <input
                  type="text"
                  value={synthesized.title}
                  onChange={(e) => setSynthesized({ ...synthesized, title: e.target.value })}
                  className="w-full px-4 py-3 text-lg font-semibold bg-bg-sidebar border border-border-medium rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface"
                  placeholder="Enter a title for your story"
                />
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Summary</label>
                <textarea
                  value={synthesized.summary}
                  onChange={(e) => setSynthesized({ ...synthesized, summary: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-bg-sidebar border border-border-medium rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface resize-none"
                  placeholder="A brief summary of your story"
                />
              </div>

              {/* Themes */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Themes</label>
                <div className="flex flex-wrap gap-2">
                  {synthesized.themes.map((theme, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent-surface text-accent-primary text-sm font-medium rounded-full"
                    >
                      {theme}
                      <button
                        onClick={() =>
                          setSynthesized({
                            ...synthesized,
                            themes: synthesized.themes.filter((_, i) => i !== idx),
                          })
                        }
                        className="ml-1 hover:text-accent-primary/70"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Raw Content Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Original Content</label>
                <div className="p-4 bg-bg-sidebar rounded-xl text-sm text-text-muted max-h-40 overflow-auto whitespace-pre-wrap">
                  {buildRawContent()}
                </div>
              </div>
            </div>
          )}

          {/* Input Step - Conversation Mode */}
          {step === "input" && mode === "conversation" && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-4 py-3 rounded-2xl",
                        message.role === "user"
                          ? "bg-text-main text-white rounded-br-md"
                          : "bg-bg-sidebar text-text-main rounded-bl-md"
                      )}
                    >
                      <p className="text-[15px] whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-bg-sidebar px-4 py-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSubmit} className="p-4 border-t border-border-subtle">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(e as unknown as React.FormEvent);
                        }
                      }}
                      placeholder="Share your thoughts..."
                      rows={1}
                      className="w-full px-4 py-3 pr-12 bg-bg-sidebar border border-border-medium rounded-xl text-[15px] text-text-main placeholder:text-text-light resize-none focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!input?.trim() || isLoading}
                    size="icon"
                    className="shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Input Step - Note Mode */}
          {step === "input" && mode === "note" && (
            <div className="flex-1 p-4">
              <Textarea
                ref={inputRef}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder={QUICK_NOTE_PLACEHOLDER}
                className="h-full min-h-[300px] resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "input" && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between">
            <p className="text-sm text-text-muted">
              {mode === "conversation"
                ? `${messages.filter((m) => m.role === "user").length} messages shared`
                : `${noteContent.length} characters`}
            </p>
            <Button
              onClick={handleSynthesize}
              disabled={!canSynthesize || isSynthesizing}
            >
              {isSynthesizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Save Story
            </Button>
          </div>
        )}

        {step === "preview" && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-end gap-3">
            <Button variant="secondary" onClick={() => setStep("input")}>
              Back to Edit
            </Button>
            <Button
              onClick={handleSave}
              disabled={!synthesized?.title || !synthesized?.summary || isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Story
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

