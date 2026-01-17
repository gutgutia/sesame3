import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { UsersTable } from "./UsersTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    filter?: string;
    page?: string;
  }>;
}

export default async function UsersPage({ searchParams }: PageProps) {
  // Check admin access
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    redirect("/");
  }

  const params = await searchParams;
  const search = params.search || "";
  const filter = params.filter || "all";
  const page = parseInt(params.page || "1");
  const perPage = 25;

  // Build where clause
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      {
        studentProfile: {
          OR: [
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  // Subscription filters
  if (filter === "free") {
    where.subscriptionTier = "free";
  } else if (filter === "paid") {
    where.subscriptionTier = "paid";
  } else if (filter === "override") {
    where.OR = [
      { overrideMessageLimit: { not: null } },
      { overrideDailyCostLimit: { not: null } },
      { overrideWeeklyCostLimit: { not: null } },
    ];
  } else if (filter === "admin") {
    where.isAdmin = true;
  }

  // Fetch users and count
  const [users, totalCount, tierCounts] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        name: true,
        accountType: true,
        subscriptionTier: true,
        subscriptionEndsAt: true,
        overrideMessageLimit: true,
        overrideDailyCostLimit: true,
        overrideWeeklyCostLimit: true,
        isAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        studentProfile: {
          select: {
            firstName: true,
            lastName: true,
            grade: true,
            graduationYear: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
    // Get tier distribution for stats
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      _count: true,
    }),
  ]);

  // Get today's usage for each user
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      userId: { in: users.map((u) => u.id) },
      date: today,
    },
    select: {
      userId: true,
      messageCount: true,
      costTotal: true,
    },
  });

  const usageMap = new Map(usageRecords.map((r) => [r.userId, r]));

  // Enrich users with today's usage
  const enrichedUsers = users.map((user) => ({
    ...user,
    todayUsage: usageMap.get(user.id) || null,
  }));

  const totalPages = Math.ceil(totalCount / perPage);

  // Calculate tier stats
  const tierStats = {
    free: tierCounts.find((t) => t.subscriptionTier === "free")?._count || 0,
    paid: tierCounts.find((t) => t.subscriptionTier === "paid")?._count || 0,
    total: tierCounts.reduce((acc, t) => acc + t._count, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-500 mt-1">
            {tierStats.total} total users ({tierStats.paid} paid, {tierStats.free} free)
          </p>
        </div>
      </div>

      <UsersTable
        users={enrichedUsers}
        currentPage={page}
        totalPages={totalPages}
        totalCount={totalCount}
        currentFilter={filter}
        currentSearch={search}
      />
    </div>
  );
}
