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

          const loadedMessages = conversation.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

          // If coming from a specific entry point (not general), add a contextual re-entry message
          // This acknowledges WHY the user came back (e.g., clicked "Need ideas?" from planning)
          // Only add if the last message was from the assistant (conversation at natural pause)
          // Don't add if user was waiting for a response
          const lastMessage = loadedMessages[loadedMessages.length - 1];
          const shouldAddReentry =
            mode !== "general" &&
            mode !== "onboarding" &&
            lastMessage?.role === "assistant";

          if (shouldAddReentry) {
            const reentryMessage = getReentryMessage(mode);
            if (reentryMessage) {
              const reentryId = `reentry-${Date.now()}`;
              loadedMessages.push({
                id: reentryId,
                role: "assistant",
                content: reentryMessage,
              });
              console.log(`[Chat] Added re-entry message for mode: ${mode}`);

              // Save re-entry message to DB so it persists across navigations
              fetch("/api/chat/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  conversationId: conversation.id,
                  role: "assistant",
                  content: reentryMessage,
                }),
              }).catch(err => console.error("[Chat] Failed to save re-entry message:", err));
            }
          }

          setMessages(loadedMessages);
          console.log(
            `[Chat] Resumed conversation ${conversation.id} with ${conversation.messages.length} messages in ${Date.now() - startTime}ms`
          );
          setIsLoading(false);
        } else {
          // New conversation - use preloaded welcome or fallback
          console.log(
            `[Chat] New conversation ${conversation.id} in ${Date.now() - startTime}ms`
          );

          // Use preloaded welcome or a fallback message
          const welcomeContent = preloadedWelcome || getFallbackWelcome(mode);
          welcomeSet.current = true;
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: welcomeContent,
            },
          ]);
          setIsLoading(false);

          // Save the welcome message to database so it persists when resuming
          fetch("/api/chat/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode, conversationId: conversation.id, saveOnly: true, message: welcomeContent }),
          }).catch(err => console.error("[Chat] Failed to save welcome:", err));
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
      // SSE events are formatted as "event: widget\ndata: {...}\n\n"
      // Plain text is sent directly without framing
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Extract SSE widget events from the buffer
        // Widget events are formatted as: "event: widget\ndata: {...}\n\n"
        // Everything else is plain text content
        let processedUpTo = 0;
        const sseEventRegex = /event: widget\ndata: ([\s\S]*?)\n\n/g;
        let match;

        while ((match = sseEventRegex.exec(buffer)) !== null) {
          // Add any text before this SSE event to fullText
          const textBefore = buffer.slice(processedUpTo, match.index);
          if (textBefore) {
            fullText += textBefore;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullText }
                  : m
              )
            );
          }

          // Parse the widget event
          try {
            const eventData = JSON.parse(match[1]);
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
            console.error("[Chat] Failed to parse widget event:", e, match[1]);
          }

          processedUpTo = match.index + match[0].length;
        }

        // Keep only the unprocessed part in the buffer
        // But also update fullText with any text after the last SSE event
        const remainingText = buffer.slice(processedUpTo);

        // Check if remaining text might contain start of an SSE event
        const potentialEventStart = remainingText.indexOf("event:");
        if (potentialEventStart === -1) {
          // No potential SSE event, all remaining is plain text
          if (remainingText) {
            fullText += remainingText;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullText }
                  : m
              )
            );
          }
          buffer = "";
        } else if (potentialEventStart > 0) {
          // There's text before the potential event start
          const textBeforeEvent = remainingText.slice(0, potentialEventStart);
          fullText += textBeforeEvent;
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: fullText }
                : m
            )
          );
          buffer = remainingText.slice(potentialEventStart);
        } else {
          // Potential event starts at beginning, keep in buffer
          buffer = remainingText;
        }
      }

      // Process any remaining buffer content as text
      // (Only if it's not an incomplete SSE event)
      if (buffer && !buffer.startsWith("event:")) {
        fullText += buffer;
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
  
  // Handle initial message - wait for conversation to load first
  useEffect(() => {
    if (hasInitialized.current) return;
    // Don't process initial message until conversation has loaded
    // (isLoading is false and conversationId is set OR we're not loading a conversation)
    if (isLoading) return;

    hasInitialized.current = true;

    if (initialMessage) {
      // Small delay to ensure state is settled after conversation load
      setTimeout(() => {
        sendMessage(initialMessage);
      }, 100);
    }
  }, [initialMessage, sendMessage, isLoading]);
  
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
                    // Preprocess: convert single newlines to paragraph breaks for proper rendering
                    <ReactMarkdown
                      components={{
                        // Style markdown elements
                        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
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
                      {normalizeMarkdownLineBreaks(msg.content)}
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
 * Normalize markdown for proper rendering.
 * Now that we preserve newlines from the stream, this is mostly a passthrough.
 * Only handles edge cases where formatting might still be off.
 */
function normalizeMarkdownLineBreaks(content: string): string {
  // The streaming fix now preserves newlines properly.
  // This function is kept for any edge case handling if needed.
  return content;
}

/**
 * Get a contextual re-entry message when user returns to chat from a specific page.
 * This acknowledges WHY they came back (e.g., clicked "Need ideas?" from planning).
 */
function getReentryMessage(mode: string): string | null {
  const messages: Record<string, string> = {
    planning: "Back for some goal brainstorming? What area would you like to focus on — summer programs, competitions, projects, or something else?",
    schools: "Looking to work on your school list? Are there specific schools you want to explore, or would you like some suggestions?",
    chances: "Want to check your chances somewhere? Which schools are you curious about?",
    profile: "Ready to update your profile? What would you like to add — activities, awards, test scores?",
    story: "Want to work on your story? Tell me about something you're passionate about or what makes you unique.",
  };
  return messages[mode] || null;
}

/**
 * Get a fallback welcome message when the preloaded welcome isn't available yet.
 * These match the fallback messages in the welcome API.
 */
function getFallbackWelcome(mode: string): string {
  const messages: Record<string, string> = {
    onboarding: "Hi! I'm Sesame, your college prep guide. I'm here to help you navigate the college journey calmly — one step at a time. First things first: what should I call you?",
    chances: "Hey! Ready to explore your admission chances? Which schools are you most curious about — or would you like me to give you a general sense of where you stand?",
    schools: "Let's build your college list! Are there any schools you're already interested in, or would you like me to suggest some based on what you're looking for?",
    planning: "Let's brainstorm some goals! What area are you thinking about — summer programs, competitions, passion projects, or something else?",
    profile: "Let's get your profile updated! What would you like to add — activities, awards, test scores, or something else?",
    story: "I'd love to hear more about you — beyond the grades and scores. What's something you're really passionate about, or what makes you unique?",
    general: "Hey! What's on your mind today?",
  };
  return messages[mode] || messages.general;
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
