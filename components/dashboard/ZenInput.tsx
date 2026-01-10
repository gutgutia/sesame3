"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function ZenInput() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    router.push(`/advisor?q=${encodeURIComponent(input)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-border-medium rounded-xl p-2 flex shadow-sm transition-all focus-within:border-accent-primary focus-within:ring-4 focus-within:ring-accent-surface mb-10">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="What's on your mind right now?"
        className="flex-1 border-none px-4 py-3 text-base outline-none text-text-main placeholder:text-text-light bg-transparent font-body"
      />
      <div className="flex gap-1">
        <button type="submit" className="w-11 h-11 flex items-center justify-center rounded-lg text-accent-primary hover:bg-accent-surface transition-colors cursor-pointer">
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
