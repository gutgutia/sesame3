"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, startTransition } from "react";
import {
  LayoutGrid,
  Compass,
  User,
  BookOpen,
  Settings,
  LogOut,
  ChevronUp,
  ChevronDown,
  Target,
  GraduationCap,
  FlaskConical,
  Trophy,
  Briefcase,
  BookOpenCheck,
  Lightbulb,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { PlanBadge } from "@/components/subscription/PlanBadge";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
};

// Main navigation items - ordered by student journey
const navItems: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: LayoutGrid },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
    children: [
      { name: "About Me", href: "/profile/about", icon: User },
      { name: "Stories", href: "/profile/stories", icon: Lightbulb },
      { name: "Testing", href: "/profile/testing", icon: FlaskConical },
      { name: "Courses", href: "/profile/courses", icon: BookOpenCheck },
      { name: "Activities", href: "/profile/activities", icon: Briefcase },
      { name: "Awards", href: "/profile/awards", icon: Trophy },
      { name: "Programs", href: "/profile/programs", icon: GraduationCap },
    ]
  },
  { name: "Schools", href: "/schools", icon: BookOpen },
  { name: "Opportunities", href: "/opportunities", icon: GraduationCap },
  { name: "Plan", href: "/plan", icon: Compass },
  { name: "Recommendations", href: "/recommendations", icon: Target },
  { name: "AI Advisor", href: "/advisor", icon: Sparkles },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, clearProfile } = useProfile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if user is admin
  useEffect(() => {
    fetch("/api/user/me")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.isAdmin) {
          setIsAdmin(true);
        }
      })
      .catch(() => {
        // Ignore errors - just don't show admin
      });
  }, []);

  // Get user's display name and initials
  const displayName = profile?.preferredName || profile?.firstName || "Student";
  const initials = (profile?.firstName?.[0] || "S").toUpperCase();

  // Auto-expand parent items based on current path
  useEffect(() => {
    const newExpanded: string[] = [];
    navItems.forEach(item => {
      if (item.children) {
        const isChildActive = item.children.some(child =>
          pathname === child.href ||
          (child.href !== "/" && child.href !== "/profile" && child.href !== "/schools" && pathname.startsWith(child.href))
        );
        // Also check if the parent path matches (e.g., /profile/something that's not in children)
        const isParentPathActive = pathname.startsWith(item.href + "/") || pathname === item.href;
        if (isChildActive || isParentPathActive) {
          newExpanded.push(item.name);
        }
      }
    });
    // Use startTransition to avoid cascading renders warning
    startTransition(() => {
      setExpandedItems(newExpanded);
    });
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear profile state first to prevent stale data on re-login
      clearProfile();
      await fetch("/api/auth/logout", { method: "POST" });
      // Use full page navigation to ensure complete state reset
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleExpanded = (name: string) => {
    setExpandedItems(prev =>
      prev.includes(name)
        ? prev.filter(n => n !== name)
        : [...prev, name]
    );
  };

  const isItemActive = (item: NavItem): boolean => {
    if (item.children) {
      // For parent items with children, check if any child is active
      return item.children.some(child =>
        pathname === child.href ||
        (child.href !== "/" && child.href !== "/profile" && child.href !== "/schools" && pathname.startsWith(child.href))
      ) || pathname.startsWith(item.href + "/") || pathname === item.href;
    }
    return pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href));
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.name);
    const isActive = isItemActive(item);

    // For child items, check exact match or startsWith for nested routes
    const isChildActive = isChild && (
      pathname === item.href ||
      (item.href !== "/" && item.href !== "/profile" && item.href !== "/schools" && pathname.startsWith(item.href + "/"))
    );

    if (hasChildren) {
      return (
        <div key={item.name}>
          <button
            onClick={() => {
              toggleExpanded(item.name);
              // Navigate to default child when clicking parent
              router.push(item.href);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted font-medium transition-all hover:bg-black/5 hover:text-text-main",
              isActive && "bg-white text-accent-primary font-semibold shadow-sm"
            )}
          >
            <item.icon className="w-5 h-5 stroke-[2px]" />
            <span className="flex-1 text-left">{item.name}</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-border-subtle pl-2">
              {item.children!.map(child => renderNavItem(child, true))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={item.href + item.name}
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-xl text-text-muted font-medium transition-all hover:bg-black/5 hover:text-text-main",
          isChild && "text-sm py-2",
          (isChild ? isChildActive : isActive) && "bg-white text-accent-primary font-semibold shadow-sm"
        )}
      >
        <item.icon className={cn("stroke-[2px]", isChild ? "w-4 h-4" : "w-5 h-5")} />
        {item.name}
      </Link>
    );
  };

  return (
    <aside className="hidden md:flex w-[260px] bg-sidebar border-r border-border-subtle p-6 flex-col sticky top-0 h-screen">
      {/* Logo */}
      <div className="mb-12">
        <Image
          src="/brand/sesame3-primary.png"
          alt="Sesame3"
          width={142}
          height={32}
          priority
        />
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {navItems.map((item) => renderNavItem(item))}
      </nav>

      {/* Discord Community Link */}
      <a
        href="https://discord.gg/t5WS2zqp"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl text-text-muted font-medium transition-all hover:bg-black/5 hover:text-text-main"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        Community
      </a>

      {/* Plan Badge */}
      <PlanBadge />

      {/* User Dropdown */}
      <div className="relative" ref={dropdownRef}>
        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-border-subtle rounded-xl shadow-lg overflow-hidden z-50">
            <Link
              href="/settings"
              onClick={() => setIsDropdownOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-surface-secondary transition-colors"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}

        {/* User Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            "w-full flex items-center gap-3 p-3 rounded-xl transition-all",
            isDropdownOpen
              ? "bg-white border border-accent-primary shadow-sm"
              : "bg-white/60 border border-border-subtle hover:bg-white hover:shadow-sm"
          )}
        >
          <div className="w-9 h-9 bg-accent-surface text-accent-primary rounded-full flex items-center justify-center font-semibold">
            {initials}
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-medium text-text-primary">{displayName}</div>
          </div>
          <ChevronUp className={cn(
            "w-4 h-4 text-text-muted transition-transform",
            isDropdownOpen ? "rotate-0" : "rotate-180"
          )} />
        </button>
      </div>
    </aside>
  );
}
