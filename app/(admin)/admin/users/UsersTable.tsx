"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Crown,
  Shield,
  Settings,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentProfile {
  firstName: string;
  lastName: string | null;
  grade: string | null;
  graduationYear: number | null;
}

interface TodayUsage {
  messageCount: number;
  costTotal: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  accountType: string;
  subscriptionTier: string;
  subscriptionEndsAt: Date | string | null;
  overrideMessageLimit: number | null;
  overrideDailyCostLimit: number | null;
  overrideWeeklyCostLimit: number | null;
  isAdmin: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date | string;
  studentProfile: StudentProfile | null;
  todayUsage: TodayUsage | null;
}

interface UsersTableProps {
  users: User[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  currentFilter: string;
  currentSearch: string;
}

interface EditModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

function EditUserModal({ user, onClose, onSave }: EditModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [subscriptionTier, setSubscriptionTier] = useState(user.subscriptionTier);
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState(
    user.subscriptionEndsAt
      ? new Date(user.subscriptionEndsAt).toISOString().split("T")[0]
      : ""
  );
  const [overrideMessageLimit, setOverrideMessageLimit] = useState(
    user.overrideMessageLimit?.toString() || ""
  );
  const [overrideDailyCostLimit, setOverrideDailyCostLimit] = useState(
    user.overrideDailyCostLimit?.toString() || ""
  );
  const [overrideWeeklyCostLimit, setOverrideWeeklyCostLimit] = useState(
    user.overrideWeeklyCostLimit?.toString() || ""
  );
  const [isAdmin, setIsAdmin] = useState(user.isAdmin);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionTier,
          subscriptionEndsAt: subscriptionEndsAt || null,
          overrideMessageLimit: overrideMessageLimit || null,
          overrideDailyCostLimit: overrideDailyCostLimit || null,
          overrideWeeklyCostLimit: overrideWeeklyCostLimit || null,
          isAdmin,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      const updatedUser = await response.json();
      onSave(updatedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Quick presets for subscription duration
  const setSubscriptionDuration = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    setSubscriptionEndsAt(date.toISOString().split("T")[0]);
    setSubscriptionTier("paid");
  };

  const displayName = user.studentProfile
    ? `${user.studentProfile.firstName} ${user.studentProfile.lastName || ""}`
    : user.name || "No name";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="font-bold text-lg">Edit User</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-6">
          {/* User Info (Read-only) */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-500 mb-1">User Info</div>
            <div className="font-medium">{displayName}</div>
            <div className="text-sm text-gray-600">
              {user.studentProfile?.grade || "No grade"}
              {user.studentProfile?.graduationYear && ` (Class of ${user.studentProfile.graduationYear})`}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </div>

          {/* Subscription Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Tier
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSubscriptionTier("free")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                  subscriptionTier === "free"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                Free
              </button>
              <button
                onClick={() => setSubscriptionTier("paid")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors",
                  subscriptionTier === "paid"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <Crown className="w-4 h-4 inline mr-1" />
                Premium
              </button>
            </div>
          </div>

          {/* Subscription End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Ends At
              <span className="font-normal text-gray-400 ml-1">
                (leave empty for permanent)
              </span>
            </label>
            <input
              type="date"
              value={subscriptionEndsAt}
              onChange={(e) => setSubscriptionEndsAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setSubscriptionDuration(1)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                +1 month
              </button>
              <button
                onClick={() => setSubscriptionDuration(3)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                +3 months
              </button>
              <button
                onClick={() => setSubscriptionDuration(12)}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                +1 year
              </button>
              <button
                onClick={() => setSubscriptionEndsAt("")}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
              >
                Permanent
              </button>
            </div>
          </div>

          {/* Override Limits */}
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">
              Override Limits
              <span className="font-normal text-gray-400 ml-1">
                (leave empty for defaults)
              </span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Messages per day
                </label>
                <input
                  type="number"
                  value={overrideMessageLimit}
                  onChange={(e) => setOverrideMessageLimit(e.target.value)}
                  placeholder="Default: 20 (free) / 500 (paid)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Daily cost limit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrideDailyCostLimit}
                  onChange={(e) => setOverrideDailyCostLimit(e.target.value)}
                  placeholder="Default: $0.50 (free) / $10 (paid)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Weekly cost limit ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={overrideWeeklyCostLimit}
                  onChange={(e) => setOverrideWeeklyCostLimit(e.target.value)}
                  placeholder="Default: $2 (free) / $50 (paid)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                />
              </div>
            </div>
          </div>

          {/* Admin Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <span className="font-medium text-sm">Admin Access</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Can access the admin panel
              </p>
            </div>
            <button
              onClick={() => setIsAdmin(!isAdmin)}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                isAdmin ? "bg-slate-900" : "bg-gray-200"
              )}
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  isAdmin ? "left-7" : "left-1"
                )}
              />
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function UsersTable({
  users,
  currentPage,
  totalPages,
  totalCount,
  currentFilter,
  currentSearch,
}: UsersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput, page: "1" });
  };

  const handleUserSaved = () => {
    setEditingUser(null);
    router.refresh();
  };

  const filters = [
    { value: "all", label: "All Users" },
    { value: "free", label: "Free" },
    { value: "paid", label: "Premium" },
    { value: "override", label: "Has Overrides" },
    { value: "admin", label: "Admins" },
  ];

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const getDisplayName = (user: User) => {
    if (user.studentProfile) {
      return `${user.studentProfile.firstName} ${user.studentProfile.lastName || ""}`.trim();
    }
    return user.name || user.email.split("@")[0];
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </form>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() =>
                  updateParams({
                    filter: f.value === "all" ? "" : f.value,
                    page: "1",
                  })
                }
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  currentFilter === f.value ||
                    (f.value === "all" && !currentFilter)
                    ? "bg-slate-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">
                  User
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Tier
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Expires
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Today&apos;s Usage
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Overrides
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">
                  Last Login
                </th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const hasOverrides =
                  user.overrideMessageLimit !== null ||
                  user.overrideDailyCostLimit !== null ||
                  user.overrideWeeklyCostLimit !== null;

                return (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-1">
                            {getDisplayName(user)}
                            {user.isAdmin && (
                              <Shield className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.subscriptionTier === "paid" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full">
                          <Crown className="w-3 h-3" />
                          Premium
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">
                      {user.subscriptionEndsAt ? (
                        <span
                          className={cn(
                            new Date(user.subscriptionEndsAt) < new Date()
                              ? "text-red-600"
                              : ""
                          )}
                        >
                          {formatDate(user.subscriptionEndsAt)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.todayUsage ? (
                        <div className="text-xs">
                          <span className="font-medium">
                            {user.todayUsage.messageCount}
                          </span>
                          <span className="text-gray-400"> msgs / </span>
                          <span className="font-medium">
                            ${user.todayUsage.costTotal.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No usage</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasOverrides ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                          <Settings className="w-3 h-3" />
                          Custom
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Default</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-xs">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {(currentPage - 1) * 25 + 1}–
            {Math.min(currentPage * 25, totalCount)} of {totalCount}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => updateParams({ page: String(currentPage - 1) })}
              disabled={currentPage <= 1}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => updateParams({ page: String(currentPage + 1) })}
              disabled={currentPage >= totalPages}
              className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleUserSaved}
        />
      )}
    </>
  );
}
