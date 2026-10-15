import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, desc } from "drizzle-orm";
import {
  ArrowLeft,
  Code,
  UploadCloud,
  AlertOctagon,
  ShieldCheck,
  Sparkles,
  Plus,
} from "lucide-react";
import { db } from "@/db";
import { projects, scans, findings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { HealthScoreRing } from "@/components/HealthScoreRing";
import { VulnerabilityReport } from "@/components/VulnerabilityReport";
import { CostOptimizer } from "@/components/CostOptimizer";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);

  const project = rows[0];
  if (!project) notFound();

  const projectScans = await db
    .select()
    .from(scans)
    .where(eq(scans.projectId, project.id))
    .orderBy(desc(scans.createdAt));

  const allFindings = await db
    .select()
    .from(findings)
    .where(eq(findings.projectId, project.id))
    .orderBy(desc(findings.createdAt));

  const counts = {
    critical: allFindings.filter((f) => f.severity === "critical" && !f.fixed).length,
    high: allFindings.filter((f) => f.severity === "high" && !f.fixed).length,
    medium: allFindings.filter((f) => f.severity === "medium" && !f.fixed).length,
    low: allFindings.filter((f) => f.severity === "low" && !f.fixed).length,
    fixed: allFindings.filter((f) => f.fixed).length,
    total: allFindings.length,
  };

  // Cost estimation
  const costFindings = allFindings.filter(
    (f) => (f.estimatedCost ?? 0) > 0 && !f.fixed,
  );
  const totalCostSavings = costFindings.reduce(
    (acc, f) => acc + (f.estimatedCost ?? 0),
    0,
  );

  return (
    <>
      <div className="mb-4">
        <Link
          href="/projects"
          className="text-xs text-[var(--color-text-muted)] hover:text-cyan-300 inline-flex items-center gap-1"
        >
          <ArrowLeft size={12} /> Retour aux projets
        </Link>
      </div>
      <PageHeader
        breadcrumb={[
          { label: "Projets", href: "/projects" },
          { label: project.name },
        ]}
        title={project.name}
        subtitle={project.description ?? undefined}
        actions={
          <Link href={`/scan/new?projectId=${project.id}`} className="btn-primary">
            <Sparkles size={16} /> Lancer une analyse
          </Link>
        }
      />

      {/* Top metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <div className="card lg:col-span-1 flex items-center justify-center py-6">
          <HealthScoreRing score={project.healthScore} size={150} />
        </div>

        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Source"
            value={project.source === "github" ? "GitHub" : "ZIP importé"}
            icon={project.source === "github" ? Code : UploadCloud}
          />
          <MetricCard
            label="Framework"
            value={project.framework ?? "—"}
          />
          <MetricCard
            label="Dernière analyse"
            value={
              projectScans[0]
                ? formatRelativeTime(projectScans[0].createdAt)
                : "—"
            }
          />
          <MetricCard
            label="Total analyses"
            value={projectScans.length.toString()}
          />
        </div>
      </div>

      {allFindings.length === 0 ? (
        <div className="card text-center py-16">
          <Sparkles size={40} className="text-cyan-400 mx-auto mb-4" />
          <h3 className="font-bold text-white text-lg">
            Aucune analyse enregistrée pour ce projet
          </h3>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Lance une première analyse pour détecter les failles et
            optimisations.
          </p>
          <Link href={`/scan/new?projectId=${project.id}`} className="btn-primary mt-6 inline-flex">
            <Plus size={16} /> Démarrer une analyse
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <VulnerabilityReport findings={allFindings} projectId={project.id} />
          </div>
          <div className="space-y-6">
            <CostOptimizer
              findings={allFindings}
              totalCostSavings={totalCostSavings}
            />
          </div>
        </div>
      )}
    </>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="card !p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)] uppercase tracking-wide mb-1.5">
        {Icon && <Icon size={12} />}
        {label}
      </div>
      <div className="font-semibold text-white truncate">{value}</div>
    </div>
  );
}
