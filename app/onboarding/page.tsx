"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  options?: string[];
  inputType?: "text" | "text-optional";
  inputPlaceholder?: string;
};

type OnboardingData = {
  name?: string;
  grade?: string;
  feeling?: string;
  dreamSchool?: string;
  hasDreamSchool?: boolean;
};

// Onboarding steps
const STEPS = {
  INTRO: 0,
  NAME: 1,
  GRADE: 2,
  FEELING: 3,
  DREAM_SCHOOL_ASK: 4,
  DREAM_SCHOOL_WHICH: 5,
  COMPLETE: 6,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [step, setStep] = useState(STEPS.INTRO);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({});
  const onboardingDataRef = useRef<OnboardingData>({}); // Ref for synchronous access
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep ref in sync with state (ref updates synchronously, state is async)
  const updateOnboardingData = (updater: (prev: OnboardingData) => OnboardingData) => {
    setOnboardingData(prev => {
      const newData = updater(prev);
      onboardingDataRef.current = newData; // Update ref synchronously
      return newData;
    });
  };

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (Object.keys(onboardingData).length > 0) {
      localStorage.setItem("sesame3_onboarding", JSON.stringify(onboardingData));
    }
  }, [onboardingData]);

  // Start the conversation
  useEffect(() => {
    if (step === STEPS.INTRO) {
      setIsTyping(true);
      setTimeout(() => {
        setMessages([
          { 
            id: "1", 
            role: "assistant", 
            text: "Hi! I'm Sesame, your college prep guide." 
          },
          { 
            id: "2", 
            role: "assistant", 
            text: "I'm here to help you navigate this journey calmly — one step at a time." 
          },
          { 
            id: "3", 
            role: "assistant", 
            text: "First, what should I call you?",
            inputType: "text",
            inputPlaceholder: "Your first name"
          }
        ]);
        setIsTyping(false);
        setStep(STEPS.NAME);
      }, 800);
    }
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when it appears
  useEffect(() => {
    if (inputRef.current && step === STEPS.NAME) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [step, messages]);

  const addUserMessage = (text: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    setMessages(prev => [...prev, userMsg]);
  };

  const addAssistantMessages = (msgs: Omit<Message, "id" | "role">[]) => {
    const newMsgs: Message[] = msgs.map((m, i) => ({
      ...m,
      id: (Date.now() + i).toString(),
      role: "assistant" as const,
    }));
    setMessages(prev => [...prev, ...newMsgs]);
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInput.trim()) return;
    
    const value = textInput.trim();
    setTextInput("");
    processResponse(value);
  };

  const handleOptionClick = (option: string) => {
    processResponse(option);
  };

  const processResponse = (response: string) => {
    addUserMessage(response);
    setIsTyping(true);

    setTimeout(() => {
      if (step === STEPS.NAME) {
        // Save name
        updateOnboardingData(prev => ({ ...prev, name: response }));

        addAssistantMessages([
          { text: `Great to meet you, ${response}! 👋` },
          {
            text: "What grade are you in?",
            options: ["9th Grade", "10th Grade", "11th Grade", "12th Grade"]
          }
        ]);
        setStep(STEPS.GRADE);
      }
      else if (step === STEPS.GRADE) {
        // Save grade
        updateOnboardingData(prev => ({ ...prev, grade: response }));

        const gradeMessage = response === "12th Grade"
          ? "Senior year — exciting times ahead!"
          : response === "11th Grade"
          ? "Junior year is a big one. You're right on time."
          : "Great time to start building your story.";

        addAssistantMessages([
          { text: gradeMessage },
          {
            text: "How are you feeling about college prep right now?",
            options: ["Overwhelmed", "Confident", "Behind", "Just Starting"]
          }
        ]);
        setStep(STEPS.FEELING);
      }
      else if (step === STEPS.FEELING) {
        // Save feeling
        updateOnboardingData(prev => ({ ...prev, feeling: response }));

        let feelingResponse = "";
        if (response === "Overwhelmed") {
          feelingResponse = "That's completely normal. We're going to break everything down into small, manageable steps.";
        } else if (response === "Behind") {
          feelingResponse = "You're not as behind as you think. Let's figure out where you stand together.";
        } else if (response === "Confident") {
          feelingResponse = "Love the energy! Let's channel that into a solid plan.";
        } else {
          feelingResponse = "Perfect starting point. We'll build this together from scratch.";
        }

        addAssistantMessages([
          { text: feelingResponse },
          {
            text: "Do you have a dream school in mind?",
            options: ["Yes, I do", "Still exploring"]
          }
        ]);
        setStep(STEPS.DREAM_SCHOOL_ASK);
      }
      else if (step === STEPS.DREAM_SCHOOL_ASK) {
        if (response === "Yes, I do") {
          updateOnboardingData(prev => ({ ...prev, hasDreamSchool: true }));
          addAssistantMessages([
            {
              text: "Which school is at the top of your list?",
              inputType: "text-optional",
              inputPlaceholder: "e.g., Stanford, MIT, UCLA..."
            }
          ]);
          setStep(STEPS.DREAM_SCHOOL_WHICH);
        } else {
          updateOnboardingData(prev => ({ ...prev, hasDreamSchool: false }));
          completeOnboarding();
        }
      }
      else if (step === STEPS.DREAM_SCHOOL_WHICH) {
        updateOnboardingData(prev => ({ ...prev, dreamSchool: response }));
        completeOnboarding(response);
      }

      setIsTyping(false);
    }, 800);
  };

  // Convert grade format: "9th Grade" -> "9th"
  const parseGrade = (grade?: string): string | undefined => {
    if (!grade) return undefined;
    return grade.replace(" Grade", "");
  };

  // Save onboarding data to the server
  const saveOnboardingData = async (dreamSchool?: string) => {
    try {
      // Use ref for current data (state may be stale due to React async updates)
      const data = onboardingDataRef.current;
      const finalData = dreamSchool
        ? { ...data, dreamSchool }
        : data;

      // Parse the name into first/last
      const nameParts = (data.name || "").trim().split(" ");
      const firstName = nameParts[0] || "Student";
      const lastName = nameParts.slice(1).join(" ") || undefined;

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          grade: parseGrade(data.grade),
          onboardingData: finalData,
          onboardingCompletedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error("Failed to save onboarding data:", await response.text());
      }
    } catch (err) {
      console.error("Failed to save onboarding data:", err);
    }
  };

  const completeOnboarding = async (dreamSchool?: string) => {
    // Use ref for display since state may be stale
    const name = onboardingDataRef.current.name || "there";

    addAssistantMessages([
      {
        text: dreamSchool
          ? `${dreamSchool} — great choice. I'll help you build a profile that stands out.`
          : "No worries — we'll explore options together as we go."
      },
      { text: `Alright ${name}, I've set up your workspace. Let's get started!` }
    ]);
    setStep(STEPS.COMPLETE);

    // Save to server (uses ref internally for current data)
    await saveOnboardingData(dreamSchool);

    // Redirect after reading
    setTimeout(() => {
      router.push("/?new=true");
    }, 2500);
  };

  const handleSkip = async () => {
    // Save whatever we have and go to dashboard
    localStorage.setItem("sesame3_onboarding", JSON.stringify(onboardingDataRef.current));
    await saveOnboardingData();
    router.push("/?new=true");
  };

  // Check if current message needs text input
  const lastMessage = messages[messages.length - 1];
  const showTextInput = lastMessage?.inputType === "text" || lastMessage?.inputType === "text-optional";
  const showOptions = lastMessage?.options && !isTyping;

  return (
    <div className="min-h-screen bg-bg-app flex">
      {/* Left: Brand Anchor */}
      <div className="hidden md:flex w-[400px] bg-bg-sidebar border-r border-border-subtle flex-col justify-between p-10">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-text-main text-white rounded-xl flex items-center justify-center font-bold text-sm">
              S3
            </div>
            <span className="font-display font-bold text-xl text-text-main">Sesame</span>
          </div>
          
          {/* Tagline */}
          <h1 className="font-display font-bold text-3xl text-text-main leading-tight mb-4">
            College prep,<br />without the panic.
          </h1>
          <p className="text-text-muted leading-relaxed">
            A calm, organized space to plan your journey — one step at a time.
          </p>
        </div>

        {/* Bottom decorative element */}
        <div className="flex items-center gap-2 text-text-light text-sm">
          <Sparkles className="w-4 h-4" />
          <span>Powered by AI that gets it.</span>
        </div>
      </div>

      {/* Right: Chat */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-bg-sidebar border-b border-border-subtle flex items-center px-4 gap-3">
          <div className="w-8 h-8 bg-text-main text-white rounded-lg flex items-center justify-center font-bold text-xs">
            S3
          </div>
          <span className="font-display font-bold text-lg">Sesame</span>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full p-4 md:p-8">
          <div className="flex-1 overflow-y-auto space-y-5 pb-4" ref={scrollRef}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex flex-col gap-3", 
                  msg.role === "user" ? "items-end" : "items-start"
                )}
              >
                <div 
                  className={cn(
                    "px-5 py-3 rounded-2xl max-w-[85%] text-[16px] leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300",
                    msg.role === "user" 
                      ? "bg-text-main text-white rounded-br-sm" 
                      : "bg-white text-text-main rounded-bl-sm border border-border-subtle shadow-sm"
                  )}
                >
                  {msg.text}
                </div>

                {/* Options (Only show for the latest assistant message) */}
                {msg.options && msg === lastMessage && !isTyping && (
                  <div className="flex flex-wrap gap-2 mt-1 animate-in fade-in duration-500 delay-150">
                    {msg.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => handleOptionClick(opt)}
                        className="px-4 py-2.5 bg-white border border-border-medium rounded-xl text-sm font-medium text-text-main hover:border-accent-primary hover:text-accent-primary hover:bg-accent-surface transition-all shadow-sm"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start animate-in fade-in duration-200">
                <div className="bg-white border border-border-subtle rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-text-muted/40 rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>

          {/* Text Input (when needed) */}
          {showTextInput && !isTyping && (
            <form onSubmit={handleTextSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={lastMessage?.inputPlaceholder || "Type here..."}
                  className="flex-1 bg-white border border-border-medium rounded-xl px-5 py-3.5 text-[16px] text-text-main placeholder:text-text-light focus:outline-none focus:border-accent-primary focus:ring-4 focus:ring-accent-surface transition-all shadow-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  className="px-5 py-3.5 bg-text-main text-white rounded-xl font-medium hover:bg-black/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </form>
          )}

          {/* Skip Link */}
          {step !== STEPS.COMPLETE && step !== STEPS.INTRO && (
            <div className="mt-6 text-center animate-in fade-in duration-500 delay-500">
              <button
                onClick={handleSkip}
                className="text-sm text-text-light hover:text-text-muted transition-colors"
              >
                Skip for now →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
