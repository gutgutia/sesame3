"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Send, ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { ConfirmationWidget, WidgetType } from "./ConfirmationWidget";
import { RecommendationCarousel } from "./RecommendationCarousel";
import { useProfile } from "@/lib/context/ProfileContext";

// Debounce helper
function useDebouncedCallback<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

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
  status: "pending" | "confirmed" | "dismissed" | "saved";
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

  // Get optimistic update functions from profile context
  const { addSchool, addProgram, refreshProfile } = useProfile();

  // Debounce profile refresh to avoid hammering the API after each widget confirmation
  // 3 second delay - if user confirms multiple widgets quickly, only refresh once at the end
  const debouncedRefreshProfile = useDebouncedCallback(() => {
    refreshProfile();
  }, 3000);

  // Simple widgets that don't need profile refresh (optimistic update is sufficient)
  const simpleOnboardingWidgets: WidgetType[] = ["name", "grade", "highschool"];

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
          // For onboarding, gracefully handle failed conversation load
          // The welcome message is fetched separately, and conversation will be created on first message
          if (mode === "onboarding") {
            console.warn("[Chat] Could not load conversation for onboarding, will use welcome message");
            setIsLoading(false);
            return;
          }
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

            // Save the welcome message to database so it persists when resuming
            fetch("/api/chat/welcome", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ mode, conversationId: conversation.id, saveOnly: true, message: preloadedWelcome }),
            }).catch(err => console.error("[Chat] Failed to save welcome:", err));
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

      // Save the welcome message to database so it persists
      fetch("/api/chat/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, conversationId, saveOnly: true, message: preloadedWelcome }),
      }).catch(err => console.error("[Chat] Failed to save welcome:", err));
    }
  }, [preloadedWelcome, conversationId, isResumedConversation, mode]);

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
        // Handle rate limit errors with a friendly message
        if (response.status === 429) {
          const data = await response.json();
          throw new Error(data.message || "You've reached your message limit. Please try again later.");
        }
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
      
      // Track widgets collected across all chunks
      const collectedWidgets: PendingWidget[] = [];

      // Read the stream - handle both SSE events and plain text
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split buffer into SSE events (separated by double newlines)
        // Process complete events, keep incomplete ones in buffer
        const parts = buffer.split("\n\n");

        // Last part might be incomplete, keep it in buffer
        buffer = parts.pop() || "";

        // Process complete SSE events
        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;

          // Check if this is a widget event
          // Use [\s\S] instead of /s flag for broader compatibility
          const widgetMatch = trimmed.match(/^event: widget\ndata: ([\s\S]+)$/);
          if (widgetMatch) {
            try {
              const eventData = JSON.parse(widgetMatch[1]);
              if (eventData.type === "widget" && eventData.widget) {
                // Normalize widget data (parser uses satTotal/satMath/satReading, API uses total/math/reading)
                const normalizedData = normalizeWidgetData(eventData.widget.type, eventData.widget.data);
                // If server already saved (secretary handled), mark as "saved" instead of "pending"
                const isSaved = eventData.saved === true;
                const widget: PendingWidget = {
                  id: `widget-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
                  type: eventData.widget.type as WidgetType,
                  data: normalizedData,
                  status: isSaved ? "saved" : "pending",
                };
                collectedWidgets.push(widget);
                console.log("[Chat] Parsed widget:", widget.type, widget.id, isSaved ? "(saved)" : "(pending)", widget.data);
              }
            } catch (e) {
              console.error("[Chat] Failed to parse widget event:", e, widgetMatch[1]);
            }
          } else {
            // Not a widget event - treat as text content
            fullText += trimmed;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullText }
                  : m
              )
            );
          }
        }
      }

      // Process any remaining buffer content as text
      if (buffer.trim()) {
        fullText += buffer.trim();
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessage.id
              ? { ...m, content: fullText }
              : m
          )
        );
      }

      // Add all collected widgets to state at once (after stream ends)
      // Deduplicate against existing widgets to avoid showing the same activity/award twice
      if (collectedWidgets.length > 0) {
        console.log("[Chat] Collected", collectedWidgets.length, "widgets:", collectedWidgets.map(w => w.type));
        setPendingWidgets(prev => {
          const newWidgets = collectedWidgets.filter(newWidget => {
            // Check if a similar widget already exists
            const isDuplicate = prev.some(existing =>
              isSimilarWidget(existing, newWidget)
            );
            if (isDuplicate) {
              console.log("[Chat] Skipping duplicate widget:", newWidget.type, newWidget.data);
            }
            return !isDuplicate;
          });
          console.log("[Chat] Adding", newWidgets.length, "new widgets after dedup");
          return [...prev, ...newWidgets];
        });
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
      const errorMessage = error instanceof Error ? error.message : "Sorry, I encountered an error. Please try again.";
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: errorMessage,
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
  
  // Get widgets to show: pending (need confirmation) and saved (show confirmation with undo)
  const currentWidgets = pendingWidgets.filter(w => w.status === "pending" || w.status === "saved");
  
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

      // Apply optimistic update BEFORE API call for instant UI feedback
      if (widget.type === "school") {
        const optimisticSchool = {
          id: `temp-${Date.now()}`,
          tier: (data.tier as string) || "reach",
          isDream: data.tier === "dream",
          status: null,
          interestLevel: null,
          school: {
            id: (data.schoolId as string) || `temp-school-${Date.now()}`,
            name: (data.name as string) || (data.schoolName as string) || "Unknown School",
            shortName: null,
            city: null,
            state: null,
            acceptanceRate: null,
            satRange25: null,
            satRange75: null,
            websiteUrl: null,
          },
        };
        addSchool(optimisticSchool);
      } else if (widget.type === "program") {
        const optimisticProgram = {
          id: `temp-${Date.now()}`,
          name: (data.name as string) || "Unknown Program",
          organization: data.organization as string | null,
          type: data.type as string | null,
          status: (data.status as string) || "interested",
          year: data.year as number | null,
          selectivity: data.selectivity as string | null,
          description: data.description as string | null,
          url: data.url as string | null,
          startDate: data.startDate as string | null,
          endDate: data.endDate as string | null,
          duration: data.duration as string | null,
        };
        addProgram(optimisticProgram);
      }

      // Mark as confirmed immediately (optimistic)
      setPendingWidgets(prev =>
        prev.map(w => w.id === widgetId ? { ...w, status: "confirmed" as const } : w)
      );

      // Normalize widget data to API format before sending
      const apiData = normalizeWidgetDataForApi(widget.type, data);

      // Call API in background
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiData),
      });

      if (response.ok) {
        // Skip refresh for simple onboarding widgets - optimistic update is sufficient
        // For other widgets, use debounced refresh to avoid hammering API
        if (!simpleOnboardingWidgets.includes(widget.type)) {
          debouncedRefreshProfile();
        }
        onProfileUpdate?.();
      } else {
        console.error("Failed to save:", await response.text());
        // TODO: Could revert optimistic update here if needed
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

  // Handle widget undo (for already-saved widgets)
  const handleWidgetUndo = async (widgetId: string) => {
    const widget = pendingWidgets.find(w => w.id === widgetId);
    if (!widget) return;

    // Mark as dismissed in UI immediately
    setPendingWidgets(prev =>
      prev.map(w => w.id === widgetId ? { ...w, status: "dismissed" as const } : w)
    );

    // TODO: Call delete API to remove from database
    // For now, we just hide it from the UI
    // The user can manually delete from their profile if needed
    console.log("[Chat] Undo saved widget:", widget.type, widget.data);

    // Use debounced refresh to avoid hammering API
    debouncedRefreshProfile();
  };

  // Check if input should be blocked (only pending non-recommendation widgets block input)
  // Saved widgets don't block because they're already confirmed
  const hasBlockingWidgets = currentWidgets.some(w =>
    w.status === "pending" && !isRecommendationWidget(w.type)
  );

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || hasBlockingWidgets) return;

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
                    "rounded-2xl px-5 py-3 text-[15px] leading-relaxed",
                    msg.role === "user"
                      ? "bg-text-main text-white rounded-br-sm whitespace-pre-wrap"
                      : "bg-white border border-border-subtle text-text-main rounded-bl-sm shadow-sm"
                  )}
                >
                  {msg.role === "user" ? (
                    // User messages: plain text
                    msg.content
                  ) : (
                    // Assistant messages: render markdown
                    <ReactMarkdown
                      components={{
                        // Style markdown elements
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="ml-1">{children}</li>,
                        a: ({ href, children }) => (
                          <a href={href} className="text-accent-primary underline" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                        code: ({ children }) => (
                          <code className="bg-bg-sidebar px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                        ),
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  )}
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
        
        {/* Widgets - show multiple side by side */}
        {currentWidgets.length > 0 && !isLoading && (
          <div className="flex flex-wrap gap-3 justify-start">
            {currentWidgets.map((widget) => (
              isRecommendationWidget(widget.type) ? (
                // Recommendation widgets use full width for better carousel display
                <div key={widget.id} className="w-full max-w-3xl">
                  <RecommendationCarousel
                    type={widget.type as "program_recommendations" | "school_recommendations"}
                    data={widget.data as { focusArea?: string; tier?: string; schools?: string[]; programs?: string[] }}
                    onAddToList={() => {
                      // Optionally track adds
                      onProfileUpdate?.();
                    }}
                    onDismiss={() => handleWidgetDismiss(widget.id)}
                  />
                </div>
              ) : widget.status === "saved" ? (
                // Already saved widgets - show compact confirmation with undo
                <div key={widget.id} className="bg-success-bg border border-[#BBF7D0] rounded-xl px-4 py-3 text-sm flex items-center gap-3">
                  <span className="text-success-text flex items-center gap-2">
                    <span>✓</span>
                    <span className="font-medium">
                      {getWidgetSummary(widget.type, widget.data)}
                    </span>
                  </span>
                  <button
                    onClick={() => handleWidgetUndo(widget.id)}
                    className="text-text-muted hover:text-text-main text-xs underline"
                  >
                    Undo
                  </button>
                </div>
              ) : (
                // Regular confirmation widgets - compact side by side
                <div key={widget.id} className="w-full sm:w-auto sm:min-w-[280px] sm:max-w-[320px]">
                  <ConfirmationWidget
                    type={widget.type}
                    data={widget.data}
                    onConfirm={(data) => handleWidgetConfirm(widget.id, data)}
                    onDismiss={() => handleWidgetDismiss(widget.id)}
                  />
                </div>
              )
            ))}
          </div>
        )}
        
        {/* Confirmed widgets indicator */}
        {pendingWidgets.filter(w => w.status === "confirmed").length > 0 && currentWidgets.length === 0 && (
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
            disabled={isLoading || hasBlockingWidgets}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading || hasBlockingWidgets}
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
    // Onboarding micro-widgets - all use profile PUT endpoint
    name: "/api/profile",
    grade: "/api/profile",
    highschool: "/api/profile",
    // Standard widgets
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
  // Onboarding widgets use PUT for profile updates
  return postTypes.includes(widgetType) ? "POST" : "PUT";
}

/**
 * Normalize widget data from parser format to API format.
 * Parser uses: satTotal, satMath, satReading, actComposite, etc.
 * API uses: total, math, reading, composite, etc.
 */
function normalizeWidgetData(widgetType: string, data: Record<string, unknown>): Record<string, unknown> {
  // Onboarding micro-widgets - keep original field names for widget display
  if (widgetType === "name") {
    return {
      firstName: data.firstName,
      lastName: data.lastName,
    };
  }

  if (widgetType === "grade") {
    return {
      grade: data.grade,
    };
  }

  if (widgetType === "highschool") {
    // Keep original field names for widget display
    // Transformation to API format happens in normalizeWidgetDataForApi
    return {
      name: data.name,
      city: data.city,
      state: data.state,
    };
  }

  // Standard widgets
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

/**
 * Normalize widget form data to API format before sending.
 * This transforms the widget's internal field names to what the API expects.
 */
function normalizeWidgetDataForApi(widgetType: WidgetType, data: Record<string, unknown>): Record<string, unknown> {
  // Onboarding micro-widgets need field name transformations
  if (widgetType === "highschool") {
    // Widget uses "name", API expects "highSchoolName"
    return {
      highSchoolName: data.name,
      highSchoolCity: data.city,
      highSchoolState: data.state,
    };
  }

  // School widget - API expects schoolId (for known) or customName (for unknown)
  if (widgetType === "school") {
    if (data.schoolId) {
      // Known school - use schoolId
      return {
        schoolId: data.schoolId,
        tier: data.tier,
        isDream: data.tier === "dream",
        whyInterested: data.whyInterested,
      };
    } else {
      // Unknown school - use customName
      return {
        customName: data.name || data.schoolName,
        tier: data.tier,
        isDream: data.tier === "dream",
        whyInterested: data.whyInterested,
      };
    }
  }

  // For other widget types, return data as-is
  return data;
}

/**
 * Get a human-readable summary of a saved widget
 */
function getWidgetSummary(widgetType: WidgetType, data: Record<string, unknown>): string {
  switch (widgetType) {
    case "name":
      return `Saved: ${data.firstName}${data.lastName ? ` ${data.lastName}` : ""}`;
    case "grade":
      return `Saved: ${data.grade}`;
    case "highschool":
      return `Saved: ${data.name}`;
    case "activity":
      return `Added activity: ${data.title || data.organization || "Activity"}`;
    case "award":
      return `Added award: ${data.title || "Award"}`;
    case "school":
      return `Added school: ${data.schoolName || data.name || "School"}`;
    case "program":
      return `Added program: ${data.name || "Program"}`;
    case "sat":
      return `Saved SAT: ${data.total || "scores"}`;
    case "act":
      return `Saved ACT: ${data.composite || "scores"}`;
    case "goal":
      return `Added goal: ${data.title || "Goal"}`;
    default:
      return "Saved";
  }
}

/**
 * Check if two widgets are similar (for deduplication)
 * Returns true if the widgets represent the same item
 */
function isSimilarWidget(existing: PendingWidget, newWidget: PendingWidget): boolean {
  // Different types are never similar
  if (existing.type !== newWidget.type) return false;

  // Normalize string for comparison (lowercase, remove common words)
  const normalize = (s: string | unknown) =>
    String(s || "")
      .toLowerCase()
      .replace(/\b(club|team|member|captain|president|treasurer|secretary|vp|vice president)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

  switch (existing.type) {
    case "activity": {
      const existingTitle = normalize(existing.data.title);
      const newTitle = normalize(newWidget.data.title);
      // Check if titles are similar (one contains the other, or share significant words)
      return (
        existingTitle.includes(newTitle) ||
        newTitle.includes(existingTitle) ||
        newTitle.split(" ").some((word: string) => word.length > 3 && existingTitle.includes(word))
      );
    }
    case "award": {
      const existingTitle = normalize(existing.data.title);
      const newTitle = normalize(newWidget.data.title);
      return existingTitle === newTitle || existingTitle.includes(newTitle) || newTitle.includes(existingTitle);
    }
    case "school": {
      const existingName = normalize(existing.data.schoolName || existing.data.name);
      const newName = normalize(newWidget.data.schoolName || newWidget.data.name);
      return existingName === newName || existingName.includes(newName) || newName.includes(existingName);
    }
    case "program": {
      const existingName = normalize(existing.data.name);
      const newName = normalize(newWidget.data.name);
      return existingName === newName || existingName.includes(newName) || newName.includes(existingName);
    }
    case "goal": {
      const existingTitle = normalize(existing.data.title);
      const newTitle = normalize(newWidget.data.title);
      return existingTitle === newTitle;
    }
    // Single-instance widgets (only one can exist)
    case "name":
    case "grade":
    case "highschool":
    case "sat":
    case "act":
    case "transcript":
      return true; // Always dedupe - only one of each
    default:
      return false;
  }
}
