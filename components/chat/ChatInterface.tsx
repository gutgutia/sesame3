"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Send, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ConfirmationWidget, WidgetType } from "./ConfirmationWidget";
import { RecommendationCarousel } from "./RecommendationCarousel";

// Message type
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

// Widget from Parser
type PendingWidget = {
  id: string;
  type: WidgetType;
  data: Record<string, unknown>;
  status: "pending" | "confirmed" | "dismissed";
};

// Loaded conversation from API
type LoadedConversation = {
  id: string;
  mode: string | null;
  isNew: boolean;
  messageCount: number;
  messages: Array<{ id: string; role: string; content: string }>;
};

interface ChatInterfaceProps {
  initialMessage?: string;
  mode?: "general" | "onboarding" | "chances" | "schools" | "planning" | "profile" | "story";
  onProfileUpdate?: () => void;
  preloadedWelcome?: string | null; // Pre-fetched welcome message from parent
}

export function ChatInterface({
  initialMessage,
  mode = "general",
  onProfileUpdate,
  preloadedWelcome,
}: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);
  const welcomeSet = useRef(false);
  const conversationLoaded = useRef(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(true); // Start loading until conversation loads
  const [pendingWidgets, setPendingWidgets] = useState<PendingWidget[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isResumedConversation, setIsResumedConversation] = useState(false);

  // Load or resume conversation on mount
  useEffect(() => {
    if (conversationLoaded.current) return;
    conversationLoaded.current = true;

    const loadConversation = async () => {
      try {
        const startTime = Date.now();
        const response = await fetch(`/api/conversations?mode=${mode}`);

        if (!response.ok) {
          console.error("[Chat] Failed to load conversation");
          setIsLoading(false);
          return;
        }

        const { conversation } = (await response.json()) as {
          conversation: LoadedConversation;
        };
        setConversationId(conversation.id);

        // If resuming an existing conversation with messages, load them
        if (!conversation.isNew && conversation.messages.length > 0) {
          setIsResumedConversation(true);
          setMessages(
            conversation.messages.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
          console.log(
            `[Chat] Resumed conversation ${conversation.id} with ${conversation.messages.length} messages in ${Date.now() - startTime}ms`
          );
          setIsLoading(false);
        } else {
          // New conversation - use preloaded welcome or fetch it
          console.log(
            `[Chat] New conversation ${conversation.id} in ${Date.now() - startTime}ms`
          );
          if (preloadedWelcome) {
            welcomeSet.current = true;
            setMessages([
              {
                id: "welcome",
                role: "assistant",
                content: preloadedWelcome,
              },
            ]);
            setIsLoading(false);
          }
          // If no preloadedWelcome yet, the useEffect below will handle it
        }
      } catch (error) {
        console.error("[Chat] Error loading conversation:", error);
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [mode, preloadedWelcome]);

  // Handle preloaded welcome message for new conversations
  useEffect(() => {
    if (welcomeSet.current || isResumedConversation) return;

    if (preloadedWelcome && conversationId) {
      welcomeSet.current = true;
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: preloadedWelcome,
        },
      ]);
      setIsLoading(false);
      console.log("[Chat] Using pre-loaded welcome message");
    }
  }, [preloadedWelcome, conversationId, isResumedConversation]);

  // Session end beacon - notify server when user leaves
  useEffect(() => {
    if (!conversationId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && conversationId) {
        // Use sendBeacon for reliable delivery even when page is closing
        const data = JSON.stringify({ conversationId });
        navigator.sendBeacon("/api/conversations/end", data);
        console.log("[Chat] Sent session end beacon");
      }
    };

    const handleBeforeUnload = () => {
      if (conversationId) {
        const data = JSON.stringify({ conversationId });
        navigator.sendBeacon("/api/conversations/end", data);
      }
    };

    // Listen for tab visibility change and page unload
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [conversationId]);

  // Send message to API with Parser + Advisor dual-model architecture
  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          conversationId,
          mode,
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
      let buffer = "";
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Read the stream - handle both SSE events and plain text
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Check for SSE widget event at start of stream
        if (buffer.includes("event: widget")) {
          const eventMatch = buffer.match(/event: widget\ndata: (.+?)(\n\n|$)/);
          if (eventMatch) {
            try {
              const eventData = JSON.parse(eventMatch[1]);
              if (eventData.type === "widget" && eventData.widget) {
                // Normalize widget data (parser uses satTotal/satMath/satReading, API uses total/math/reading)
                const normalizedData = normalizeWidgetData(eventData.widget.type, eventData.widget.data);
                const widget: PendingWidget = {
                  id: `widget-${Date.now()}`,
                  type: eventData.widget.type as WidgetType,
                  data: normalizedData,
                  status: "pending",
                };
                setPendingWidgets(prev => [...prev, widget]);
              }
            } catch (e) {
              console.error("[Chat] Failed to parse widget event:", e);
            }
            // Remove the SSE event from buffer, keep the rest as text
            buffer = buffer.replace(/event: widget\ndata: .+?(\n\n|$)/, "");
          }
        }
        
        // Everything else is text content
        if (buffer) {
          fullText = buffer;
          setMessages(prev => 
            prev.map(m => 
              m.id === assistantMessage.id 
                ? { ...m, content: fullText }
                : m
            )
          );
        }
      }
      
      // Fallback for empty response
      if (!fullText.trim()) {
        console.warn("Empty AI response received");
        setMessages(prev => 
          prev.map(m => 
            m.id === assistantMessage.id 
              ? { ...m, content: "I got that! What else would you like to share?" }
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
  }, [messages, mode, conversationId]);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pendingWidgets, isLoading]);
  
  // Handle initial message
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    if (initialMessage) {
      setTimeout(() => {
        sendMessage(initialMessage);
      }, 500);
    }
  }, [initialMessage, sendMessage]);
  
  // Get current pending widget (show one at a time)
  const currentWidget = pendingWidgets.find(w => w.status === "pending");
  
  // Handle widget confirmation
  const handleWidgetConfirm = async (widgetId: string, data: Record<string, unknown>) => {
    const widget = pendingWidgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Transcript widget handles its own upload - just mark as confirmed
    if (widget.type === "transcript") {
      if (data.type === "transcript_extracted" && Array.isArray(data.courses)) {
        // Save extracted courses via bulk API
        try {
          const response = await fetch("/api/profile/courses/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courses: data.courses }),
          });
          if (response.ok) {
            setPendingWidgets(prev =>
              prev.map(w => w.id === widgetId ? { ...w, status: "confirmed" as const } : w)
            );
            onProfileUpdate?.();
          }
        } catch (error) {
          console.error("Failed to save courses:", error);
        }
      } else {
        // Just dismiss if no courses
        setPendingWidgets(prev =>
          prev.map(w => w.id === widgetId ? { ...w, status: "dismissed" as const } : w)
        );
      }
      return;
    }

    try {
      const endpoint = getApiEndpoint(widget.type);
      if (!endpoint) {
        console.error("No endpoint for widget type:", widget.type);
        return;
      }
      const method = getApiMethod(widget.type);

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setPendingWidgets(prev =>
          prev.map(w => w.id === widgetId ? { ...w, status: "confirmed" as const } : w)
        );
        onProfileUpdate?.();
      } else {
        console.error("Failed to save:", await response.text());
      }
    } catch (error) {
      console.error("Failed to save data:", error);
    }
  };
  
  // Handle widget dismiss
  const handleWidgetDismiss = (widgetId: string) => {
    setPendingWidgets(prev => 
      prev.map(w => w.id === widgetId ? { ...w, status: "dismissed" as const } : w)
    );
  };
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || currentWidget) return;
    
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 flex items-center px-6 border-b border-border-subtle bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Link
          href="/"
          className="mr-4 p-2 hover:bg-bg-sidebar rounded-full transition-colors text-text-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-text-main text-white rounded-full flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-text-main">Sesame</span>
          {isLoading && (
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div className="max-w-[85%]">
              {msg.content && (
                <div
                  className={cn(
                    "rounded-2xl px-5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-text-main text-white rounded-br-sm"
                      : "bg-white border border-border-subtle text-text-main rounded-bl-sm shadow-sm"
                  )}
                >
                  {msg.content}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-white border border-border-subtle rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        
        {/* Current pending widget */}
        {currentWidget && !isLoading && (
          <div className="flex justify-start">
            {isRecommendationWidget(currentWidget.type) ? (
              // Recommendation widgets use full width for better carousel display
              <div className="w-full max-w-3xl">
                <RecommendationCarousel
                  type={currentWidget.type as "program_recommendations" | "school_recommendations"}
                  data={currentWidget.data as { focusArea?: string; tier?: string; schools?: string[]; programs?: string[] }}
                  onAddToList={() => {
                    // Optionally track adds
                    onProfileUpdate?.();
                  }}
                  onDismiss={() => handleWidgetDismiss(currentWidget.id)}
                />
              </div>
            ) : (
              // Regular confirmation widgets are narrower
              <div className="max-w-md w-full">
                <ConfirmationWidget
                  type={currentWidget.type}
                  data={currentWidget.data}
                  onConfirm={(data) => handleWidgetConfirm(currentWidget.id, data)}
                  onDismiss={() => handleWidgetDismiss(currentWidget.id)}
                />
              </div>
            )}
          </div>
        )}
        
        {/* Confirmed widgets indicator */}
        {pendingWidgets.filter(w => w.status === "confirmed").length > 0 && !currentWidget && (
          <div className="flex justify-start">
            <div className="bg-success-bg border border-[#BBF7D0] rounded-xl px-4 py-2 text-sm text-success-text flex items-center gap-2">
              <span>✓</span>
              <span>
                {pendingWidgets.filter(w => w.status === "confirmed").length} item(s) saved to your profile
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 bg-white border-t border-border-subtle">
        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-bg-sidebar border border-border-medium rounded-xl pl-5 pr-14 py-4 text-[15px] focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-surface transition-all"
            disabled={isLoading || (!!currentWidget && !isRecommendationWidget(currentWidget.type))}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || (!!currentWidget && !isRecommendationWidget(currentWidget.type))}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-text-main text-white rounded-lg hover:bg-black/80 disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

// Helper functions

function isRecommendationWidget(type: WidgetType): boolean {
  return type === "program_recommendations" || type === "school_recommendations";
}

function getApiEndpoint(widgetType: WidgetType): string | null {
  const endpoints: Record<WidgetType, string | null> = {
    sat: "/api/profile/testing/sat",
    act: "/api/profile/testing/act",
    activity: "/api/profile/activities",
    award: "/api/profile/awards",
    transcript: null,  // Handled by widget itself
    program: "/api/profile/programs",
    goal: "/api/profile/goals",
    school: "/api/profile/schools",
    profile: "/api/profile",
    // Recommendation widgets don't need endpoints (they fetch their own data)
    program_recommendations: null,
    school_recommendations: null,
  };

  return endpoints[widgetType];
}

function getApiMethod(widgetType: WidgetType): string {
  const postTypes: WidgetType[] = ["activity", "award", "program", "goal", "school", "sat", "act"];
  return postTypes.includes(widgetType) ? "POST" : "PUT";
}

/**
 * Normalize widget data from parser format to API format.
 * Parser uses: satTotal, satMath, satReading, actComposite, etc.
 * API uses: total, math, reading, composite, etc.
 */
function normalizeWidgetData(widgetType: string, data: Record<string, unknown>): Record<string, unknown> {
  if (widgetType === "sat") {
    return {
      total: data.satTotal ?? data.total,
      math: data.satMath ?? data.math,
      reading: data.satReading ?? data.reading,
      testDate: data.testDate,
    };
  }

  if (widgetType === "act") {
    return {
      composite: data.actComposite ?? data.composite,
      english: data.actEnglish ?? data.english,
      math: data.actMath ?? data.math,
      reading: data.actReading ?? data.reading,
      science: data.actScience ?? data.science,
      testDate: data.testDate,
    };
  }

  // For other widget types, return data as-is
  return data;
}
