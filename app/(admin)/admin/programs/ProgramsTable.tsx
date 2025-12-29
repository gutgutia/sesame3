"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Program {
  id: string;
  name: string;
  shortName: string | null;
  organization: string | null;
  category: string | null;
  applicationOpens: Date | null;
  applicationDeadline: Date | null;
  format: string | null;
  location: string | null;
}

interface ProgramsTableProps {
  programs: Program[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  currentFilter: string;
  currentCategory: string;
  currentSearch: string;
  categories: string[];
}

export function ProgramsTable({
  programs,
  currentPage,
  totalPages,
  totalCount,
  currentFilter,
  currentCategory,
  currentSearch,
  categories,
}: ProgramsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(currentSearch);

  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    router.push(`/admin/programs?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput, page: "1" });
  };

  const getDeadlineStatus = (program: Program) => {
    if (program.applicationDeadline) {
      return { status: "complete", label: "Has Deadline", color: "text-green-600" };
    }
    return { status: "missing", label: "No Deadline", color: "text-red-600" };
  };

  const filters = [
    { value: "all", label: "All Programs" },
    { value: "missing-deadlines", label: "Missing Deadlines" },
    { value: "pending-review", label: "Pending Review" },
    { value: "verified", label: "Verified" },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => updateParams({ filter: f.value, page: "1" })}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                currentFilter === f.value || (f.value === "all" && !currentFilter)
                  ? "bg-slate-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category Filter */}
        <select
          value={currentCategory}
          onChange={(e) => updateParams({ category: e.target.value, page: "1" })}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Program</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Organization</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Format</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Deadline</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {programs.map((program) => {
              const deadlineStatus = getDeadlineStatus(program);

              return (
                <tr
                  key={program.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/programs/${program.id}`)}
                >
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{program.name}</div>
                      {program.shortName && (
                        <div className="text-xs text-gray-500">{program.shortName}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {program.organization || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {program.category && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {program.category}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {program.format ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full capitalize">
                        {program.format}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DateCell date={program.applicationDeadline} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn("text-xs font-medium", deadlineStatus.color)}>
                      {deadlineStatus.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(
                            `https://www.google.com/search?q=${encodeURIComponent(program.name + " summer program application")}`,
                            "_blank"
                          );
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        title="Search"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
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
          Showing {(currentPage - 1) * 25 + 1}–{Math.min(currentPage * 25, totalCount)} of {totalCount}
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
  );
}

function DateCell({ date }: { date: Date | null }) {
  if (!date) {
    return <X className="w-4 h-4 text-gray-300 mx-auto" />;
  }

  return <span className="text-gray-600">{formatDate(date)}</span>;
}

function formatDate(date: Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
