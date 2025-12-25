"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Sparkles, ArrowLeft, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { STORY_OPENER, STORY_INPUT_PLACEHOLDER } from "@/lib/prompts";

interface ShareStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStorySaved: () => void;
}

type Step = "input" | "synthesizing" | "preview";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface SynthesizedStory {
  title: string;
  summary: string;
  themes: string[];
}

export function ShareStoryModal({ isOpen, onClose, onStorySaved }: ShareStoryModalProps) {
  const [step, setStep] = useState<Step>("input");
  const [synthesized, setSynthesized] = useState<SynthesizedStory | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  // Unified state - starts with large input, then becomes chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("input");
      setInputValue("");
      setSynthesized(null);
      setMessages([]);
      setIsLoading(false);
      setHasStarted(false);
      setShowRawContent(false);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current && !hasStarted) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, hasStarted]);

  // Send message (manual fetch, same pattern as ChatInterface)
  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);
    setHasStarted(true);

    try {
      const response = await fetch("/api/profile/stories/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullText = "";

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Read the stream (plain text)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: fullText }
              : m
          )
        );
      }

      // Fallback for empty response
      if (!fullText.trim()) {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: "I'd love to hear more about that. What else would you like to share?" }
              : m
          )
        );
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  // Handle initial share or follow-up message
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    sendMessage(inputValue.trim());
    setInputValue("");
  };

  // Build raw content from conversation
  const buildRawContent = (): string => {
    return messages
      .map((m) => `${m.role === "user" ? "Student" : "Counselor"}: ${m.content}`)
      .join("\n\n");
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
          contentType: "conversation",
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
          contentType: "conversation",
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

  // Can save after at least one user message with meaningful content
  const canSave = messages.filter((m) => m.role === "user").length >= 1;

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
              {step !== "preview" && (
                <p className="text-sm text-text-muted">
                  {hasStarted ? "Continue the conversation or save when ready" : "Tell me something meaningful about you"}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 -m-2 text-text-muted hover:text-text-main hover:bg-bg-sidebar rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Synthesizing State */}
          {step === "synthesizing" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="w-16 h-16 rounded-full bg-accent-surface flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-accent-primary animate-pulse" />
              </div>
              <div className="text-center">
                <p className="font-medium text-text-main">Creating your story...</p>
                <p className="text-sm text-text-muted mt-1">Generating title, summary, and themes</p>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && synthesized && (
            <div className="flex-1 overflow-auto p-6 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Title</label>
                <input
                  type="text"
                  value={synthesized.title}
                  onChange={(e) => setSynthesized({ ...synthesized, title: e.target.value })}
                  className="w-full px-4 py-3 text-[15px] bg-bg-sidebar border border-border-medium rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface"
                  placeholder="Enter a title for your story"
                />
              </div>

              {/* Summary - Larger and more prominent */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-muted">Summary</label>
                <textarea
                  value={synthesized.summary}
                  onChange={(e) => setSynthesized({ ...synthesized, summary: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 text-[15px] bg-bg-sidebar border border-border-medium rounded-xl focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface resize-y min-h-[160px]"
                  placeholder="Your story summary"
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

              {/* Raw Content - Collapsed by default */}
              <div className="border-t border-border-subtle pt-4">
                <button
                  type="button"
                  onClick={() => setShowRawContent(!showRawContent)}
                  className="flex items-center gap-2 text-sm text-text-muted hover:text-text-main transition-colors"
                >
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform",
                    showRawContent && "rotate-180"
                  )} />
                  View original conversation
                </button>
                {showRawContent && (
                  <div className="mt-3 p-4 bg-bg-sidebar rounded-xl text-sm text-text-muted max-h-48 overflow-auto whitespace-pre-wrap">
                    {buildRawContent()}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Input Step */}
          {step === "input" && (
            <>
              {/* Initial State - Big Text Area */}
              {!hasStarted ? (
                <div className="flex-1 p-6 flex flex-col">
                  {/* Brief opener */}
                  <div className="mb-4">
                    <p className="text-lg text-text-main font-medium">{STORY_OPENER}</p>
                  </div>
                  
                  {/* Large textarea */}
                  <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={STORY_INPUT_PLACEHOLDER}
                      className="flex-1 w-full px-4 py-4 text-[15px] bg-bg-sidebar border border-border-medium rounded-xl text-text-main placeholder:text-text-light resize-none focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface min-h-[200px]"
                    />
                    <div className="flex justify-end mt-4">
                      <Button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        Share
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Conversation Mode - After First Message */
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
                        <div className="bg-bg-sidebar px-4 py-3 rounded-2xl rounded-bl-md flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input + Save Button */}
                  <div className="p-4 border-t border-border-subtle space-y-3">
                    {/* Input Row */}
                    <form onSubmit={handleSubmit} className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <textarea
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSubmit(e);
                            }
                          }}
                          placeholder="Share more, or save when you're ready..."
                          rows={1}
                          className="w-full px-4 py-3 pr-12 bg-bg-sidebar border border-border-medium rounded-xl text-[15px] text-text-main placeholder:text-text-light resize-none focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface"
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={!inputValue.trim() || isLoading}
                        size="icon"
                        variant="secondary"
                        className="shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                    
                    {/* Save Story Button - Always Visible */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-text-muted">
                        {messages.filter((m) => m.role === "user").length} message{messages.filter((m) => m.role === "user").length !== 1 ? 's' : ''} shared
                      </p>
                      <Button
                        onClick={handleSynthesize}
                        disabled={!canSave || isSynthesizing || isLoading}
                      >
                        {isSynthesizing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        I'm Done — Save Story
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Preview Footer */}
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
