import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { ProgramEditForm } from "./ProgramEditForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProgramEditPage({ params }: PageProps) {
  // Check admin access
  const hasAccess = await isAdmin();
  if (!hasAccess) {
    redirect("/");
  }

  const { id } = await params;

  const program = await prisma.summerProgram.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { startDate: "asc" },
      },
    },
  });

  if (!program) {
    notFound();
  }

  return (
    <div className="max-w-4xl">
      <ProgramEditForm program={program} />
    </div>
  );
}
