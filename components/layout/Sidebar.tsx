"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutGrid,
  Compass,
  User,
  BookOpen,
  Search,
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
  MessageSquare,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProfile } from "@/lib/context/ProfileContext";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
};

const navItems: NavItem[] = [
  { name: "Home", href: "/", icon: LayoutGrid },
  { name: "Advisor", href: "/advisor", icon: MessageSquare },
  { name: "Plan", href: "/plan", icon: Compass },
  {
    name: "Profile",
    href: "/profile",
    icon: User,
    children: [
      { name: "Overview", href: "/profile", icon: User },
      { name: "Story", href: "/profile/about-me", icon: Lightbulb },
      { name: "Testing", href: "/profile/testing", icon: FlaskConical },
      { name: "Courses", href: "/profile/courses", icon: BookOpenCheck },
      { name: "Activities", href: "/profile/activities", icon: Briefcase },
      { name: "Awards", href: "/profile/awards", icon: Trophy },
      { name: "Programs", href: "/profile/programs", icon: GraduationCap },
    ]
  },
  {
    name: "Schools",
    href: "/schools",
    icon: BookOpen,
    children: [
      { name: "My Schools", href: "/schools", icon: BookOpen },
      { name: "Chances", href: "/chances", icon: Target },
    ]
  },
  { name: "Opportunities", href: "/opportunities", icon: Lightbulb },
  { name: "Discover", href: "/discover", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useProfile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    setExpandedItems(newExpanded);
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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
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
      <div className="flex items-center gap-2 mb-12">
        <div className="w-8 h-8 bg-text-main text-white rounded-lg flex items-center justify-center font-bold text-lg">
          S3
        </div>
        <span className="font-display font-bold text-2xl text-text-main">Sesame</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
        {navItems.map((item) => renderNavItem(item))}
      </nav>

      {/* User Dropdown */}
      <div className="mt-auto relative" ref={dropdownRef}>
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
