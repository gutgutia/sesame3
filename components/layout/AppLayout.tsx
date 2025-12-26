"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg-app font-body text-text-main w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen w-full relative">
         {/* Mobile Header */}
         <header className="md:hidden h-14 bg-bg-sidebar border-b border-border-subtle flex items-center px-4 sticky top-0 z-40 justify-between">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-text-main text-white rounded flex items-center justify-center font-bold text-xs">S3</div>
                <span className="font-display font-bold text-lg">Sesame</span>
            </div>
            <div className="w-8 h-8 bg-accent-surface text-accent-primary rounded-full flex items-center justify-center font-semibold text-xs">R</div>
         </header>

         <main className="flex-1 w-full max-w-[1400px] mx-auto p-4 md:p-10 pb-24 md:pb-10">
            {children}
         </main>
      </div>
      <BottomNav />
    </div>
  );
}
