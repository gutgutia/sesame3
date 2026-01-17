import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { School, Building2, Users, AlertTriangle } from "lucide-react";

export default async function AdminDashboard() {
  // Check admin access
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    redirect("/");
  }

  // Fetch counts
  const [schoolCount, programCount, userCount] = await Promise.all([
    prisma.school.count(),
    prisma.summerProgram.count(),
    prisma.studentProfile.count(),
  ]);

  // Find schools/programs missing configuration
  const schoolsMissingDeadlines = await prisma.school.count({
    where: {
      AND: [
        { hasEarlyDecision: false },
        { hasEarlyDecisionII: false },
        { hasEarlyAction: false },
        { hasRollingAdmissions: false },
      ],
    },
  });

  const programsMissingDeadlines = await prisma.summerProgram.count({
    where: {
      applicationDeadline: null,
    },
  });

  const stats = [
    {
      label: "Schools",
      value: schoolCount,
      icon: School,
      color: "bg-blue-500",
      href: "/admin/schools",
    },
    {
      label: "Programs",
      value: programCount,
      icon: Building2,
      color: "bg-green-500",
      href: "/admin/programs",
    },
    {
      label: "Users",
      value: userCount,
      icon: Users,
      color: "bg-purple-500",
      href: "/admin/users",
    },
    {
      label: "Missing Deadlines",
      value: schoolsMissingDeadlines + programsMissingDeadlines,
      icon: AlertTriangle,
      color: "bg-amber-500",
      href: "/admin/schools?filter=missing-deadlines",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Manage schools, programs, and data imports
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          <ActionCard
            title="Import from College Scorecard"
            description="Bulk import school data from the federal database"
            href="/admin/data-import?source=scorecard"
          />
          <ActionCard
            title="Run LLM Deadline Scraper"
            description="Use AI to find and extract deadline data"
            href="/admin/llm-tools?action=scrape-deadlines"
          />
          <ActionCard
            title="Review Pending Data"
            description="Review LLM-extracted data before publishing"
            href="/admin/schools?filter=pending-review"
          />
        </div>
      </div>

      {/* Data Quality */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-lg mb-4">Data Quality</h2>
        <div className="space-y-3">
          <QualityRow
            label="Schools with complete deadline data"
            current={schoolCount - schoolsMissingDeadlines}
            total={schoolCount}
          />
          <QualityRow
            label="Programs with application deadline"
            current={programCount - programsMissingDeadlines}
            total={programCount}
          />
        </div>
      </div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <h3 className="font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </a>
  );
}

function QualityRow({
  label,
  current,
  total,
}: {
  label: string;
  current: number;
  total: number;
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
