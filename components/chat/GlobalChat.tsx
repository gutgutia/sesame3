"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Send, Sparkles, User, GraduationCap, Trophy, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  action?: {
    type: "update_portfolio" | "add_school" | "create_task";
    data: any;
    label: string;
  };
};

export function GlobalChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      text: "Hi Rohan. I'm Sesame3. I can help you update your profile, research schools, or plan your next move. What's on your mind?",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI processing & tool calling
    setTimeout(() => {
      let aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "I didn't catch that. Could you be more specific?",
      };

      // Mock Logic for Demo
      const lower = userMsg.text.toLowerCase();
      if (lower.includes("sat") || lower.includes("score")) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "Got it. A 1520 is an excellent score! I've updated your Testing profile. This puts you in the 75th percentile for most Ivy League schools.",
          action: {
            type: "update_portfolio",
            label: "Updated Testing: SAT 1520",
            data: { section: "Testing", value: "1520" }
          }
        };
      } else if (lower.includes("stanford") || lower.includes("harvard")) {
        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: "Stanford is a Reach school for almost everyone, but your new SAT score helps. Do you want me to add it to your school list?",
          action: {
            type: "add_school",
            label: "Add Stanford to List",
            data: { school: "Stanford" }
          }
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:items-end md:justify-end md:p-6 bg-black/20 backdrop-blur-sm md:backdrop-blur-none md:bg-transparent">
      <div className="bg-white w-full h-full md:w-[400px] md:h-[600px] md:rounded-2xl shadow-2xl flex flex-col border border-border-subtle animate-in slide-in-from-bottom-10 fade-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-[#FAFAF9] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-text-main text-white rounded-full flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-accent-primary" fill="currentColor" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-text-main">Sesame3 Advisor</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-[11px] text-text-muted">Online</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-lg text-text-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-app" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex w-full",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "bg-text-main text-white rounded-br-none"
                    : "bg-white border border-border-subtle text-text-main rounded-bl-none"
                )}
              >
                {msg.text}
                
                {/* Action Card (If AI performed an action) */}
                {msg.action && (
                  <div className="mt-3 bg-accent-surface/50 border border-accent-border rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-border-subtle text-accent-primary shadow-sm">
                      {msg.action.type === "update_portfolio" && <GraduationCap className="w-4 h-4" />}
                      {msg.action.type === "add_school" && <GraduationCap className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-text-muted uppercase font-bold tracking-wider mb-0.5">Action</div>
                      <div className="text-sm font-semibold text-text-main">{msg.action.label}</div>
                    </div>
                    <div className="text-accent-primary">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start w-full">
              <div className="bg-white border border-border-subtle rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-border-subtle">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Auto-resize textarea to fit content
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
              }}
              onKeyDown={(e) => {
                // Enter without Shift sends the message
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
                // Shift+Enter creates a new line (default textarea behavior)
              }}
              placeholder="Type a message..."
              className="w-full bg-bg-sidebar border border-border-medium rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-surface transition-all resize-none min-h-[48px] max-h-[200px] overflow-y-auto"
              autoFocus
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-text-main text-white rounded-lg hover:bg-black/80 disabled:opacity-50 disabled:hover:bg-text-main transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
