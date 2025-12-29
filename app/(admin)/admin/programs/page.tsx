import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { ProgramsTable } from "./ProgramsTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    filter?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function ProgramsPage({ searchParams }: PageProps) {
  // Check admin access
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    redirect("/");
  }

  const params = await searchParams;
  const search = params.search || "";
  const filter = params.filter || "all";
  const category = params.category || "all";
  const page = parseInt(params.page || "1");
  const perPage = 25;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { shortName: { contains: search, mode: "insensitive" } },
      { organization: { contains: search, mode: "insensitive" } },
    ];
  }

  if (category !== "all") {
    where.category = category;
  }

  if (filter === "missing-deadlines") {
    where.applicationDeadline = null;
  } else if (filter === "pending-review") {
    where.dataStatus = "pending_review";
  } else if (filter === "verified") {
    where.dataStatus = "verified";
  }

  const [programs, totalCount, categories] = await Promise.all([
    prisma.summerProgram.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        shortName: true,
        organization: true,
        category: true,
        applicationOpens: true,
        applicationDeadline: true,
        format: true,
        location: true,
      },
    }),
    prisma.summerProgram.count({ where }),
    // Get unique categories for filter
    prisma.summerProgram.findMany({
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  const totalPages = Math.ceil(totalCount / perPage);
  const uniqueCategories = categories.map((c) => c.category).filter(Boolean) as string[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Summer Programs</h1>
          <p className="text-gray-500 mt-1">
            {totalCount} programs in database
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/programs/new"
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
          >
            Add Program
          </a>
          <a
            href="/admin/llm-tools?action=discover-programs"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Discover with AI
          </a>
        </div>
      </div>

      <ProgramsTable
        programs={programs}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        currentFilter={filter}
        currentCategory={category}
        currentSearch={search}
        categories={uniqueCategories}
      />
    </div>
  );
}
