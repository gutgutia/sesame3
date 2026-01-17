import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

/**
 * GET /api/admin/users
 * List all users with pagination, search, and filtering
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const filter = searchParams.get("filter") || "all";
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("perPage") || "25");

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
      // Users with any admin overrides
      where.OR = [
        { overrideMessageLimit: { not: null } },
        { overrideDailyCostLimit: { not: null } },
        { overrideWeeklyCostLimit: { not: null } },
      ];
    } else if (filter === "admin") {
      where.isAdmin = true;
    }

    const [users, totalCount] = await Promise.all([
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
          _count: {
            select: {
              usageRecords: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
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

    return NextResponse.json({
      users: enrichedUsers,
      pagination: {
        page,
        perPage,
        totalCount,
        totalPages: Math.ceil(totalCount / perPage),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[Admin Users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
