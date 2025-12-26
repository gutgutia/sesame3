"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Compass, User, BookOpen, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Home", href: "/", icon: LayoutGrid, matchPaths: ["/"] },
  { name: "Advisor", href: "/advisor", icon: MessageSquare, matchPaths: ["/advisor"] },
  { name: "Plan", href: "/plan", icon: Compass, matchPaths: ["/plan"] },
  { name: "Profile", href: "/profile", icon: User, matchPaths: ["/profile"] },
  { name: "Schools", href: "/schools", icon: BookOpen, matchPaths: ["/schools", "/chances"] },
];

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (item: typeof navItems[0]) => {
    return item.matchPaths.some(path =>
      pathname === path ||
      (path !== "/" && pathname.startsWith(path + "/")) ||
      pathname.startsWith(path)
    );
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border-subtle pb-safe pt-2 px-6 z-50">
      <div className="flex justify-between items-center h-16">
        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 text-[10px] font-medium text-text-muted transition-colors",
                active && "text-accent-primary"
              )}
            >
              <div className={cn(
                  "p-1.5 rounded-lg transition-all",
                  active && "bg-accent-surface"
              )}>
                <item.icon className="w-6 h-6 stroke-[2px]" />
              </div>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
