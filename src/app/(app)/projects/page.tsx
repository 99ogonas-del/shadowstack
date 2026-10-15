import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import {
  Plus,
  Code,
  UploadCloud,
  Trash2,
  Eye,
  ChevronRight,
} from "lucide-react";
import { db } from "@/db";
import { projects, scans, findings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  formatRelativeTime,
  formatDateTime,
  severityColor,
} from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUser();

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  // For each project, count findings by severity
  const projectsWithStats = await Promise.all(
    userProjects.map(async (p) => {
      const projectFindings = await db
        .select()
        .from(findings)
        .where(eq(findings.projectId, p.id));

      const projectScans = await db
        .select()
        .from(scans)
        .where(eq(scans.projectId, p.id))
        .orderBy(desc(scans.createdAt))
        .limit(1);

      return {
        ...p,
        findingsCount: projectFindings.length,
        openFindings: projectFindings.filter((f) => !f.fixed).length,
        critical: projectFindings.filter(
          (f) => f.severity === "critical" && !f.fixed,
        ).length,
        lastScan: projectScans[0] ?? null,
      };
    }),
  );

  return (
    <>
      <PageHeader
        title="Projets"
        subtitle="Liste de tous tes projets analysés. Crée-en un nouveau ou explore les détails."
        actions={
          <Link href="/scan/new" className="btn-primary">
            <Plus size={16} /> Nouveau projet
          </Link>
        }
      />

      {projectsWithStats.length === 0 ? (
        <div className="card text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-4">
            <Code size={28} className="text-cyan-300" />
          </div>
          <h3 className="text-lg font-bold text-white">Aucun projet pour l'instant</h3>
          <p className="mt-2 text-[var(--color-text-muted)] max-w-md mx-auto">
            Ajoute ton premier projet pour commencer à détecter les failles,
            optimisations et économies d'API.
          </p>
          <Link href="/scan/new" className="btn-primary mt-6 inline-flex">
            <Plus size={16} /> Créer un projet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projectsWithStats.map((p) => (
            <div
              key={p.id}
              className="card hover:border-[var(--color-border-light)] transition group"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <Link href={`/projects/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    {p.source === "github" ? (
                      <Code size={20} className="text-cyan-300" />
                    ) : (
                      <UploadCloud size={20} className="text-purple-300" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate group-hover:text-cyan-300 transition">
                      {p.name}
                    </div>
                    <div className="text-xs text-[var(--color-text-dim)] truncate">
                      {p.framework}
                    </div>
                  </div>
                </Link>
                <DeleteProjectButton projectId={p.id} name={p.name} />
              </div>

              {p.description && (
                <p className="text-sm text-[var(--color-text-muted)] mb-3 line-clamp-2">
                  {p.description}
                </p>
              )}

              <div className="flex items-center justify-between mb-3">
                <ScorePill score={p.healthScore} />
                <span className="text-xs text-[var(--color-text-dim)]">
                  {formatRelativeTime(p.createdAt)}
                </span>
              </div>

              {p.openFindings > 0 ? (
                <div className="flex items-center gap-2 mb-3 text-xs">
                  {p.critical > 0 && (
                    <SeverityBadge count={p.critical} severity="critical" />
                  )}
                  <span className="text-[var(--color-text-muted)]">
                    {p.openFindings} problème{p.openFindings > 1 ? "s" : ""} à
                    corriger
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mb-3 text-xs text-green-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  Tout est propre
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-[var(--color-border)]">
                <Link
                  href={`/projects/${p.id}`}
                  className="btn-secondary flex-1 justify-center text-sm"
                >
                  <Eye size={14} /> Voir
                </Link>
                <Link
                  href={`/scan/new?projectId=${p.id}`}
                  className="btn-secondary flex-1 justify-center text-sm"
                >
                  Re-analyser
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 90
      ? "from-green-400 to-emerald-500 text-green-300"
      : score >= 75
      ? "from-cyan-400 to-blue-500 text-cyan-300"
      : score >= 60
      ? "from-yellow-400 to-orange-500 text-yellow-300"
      : "from-red-400 to-pink-500 text-red-300";
  return (
    <div className="inline-flex items-center gap-2">
      <div
        className={`px-3 py-1.5 rounded-lg bg-gradient-to-br ${color.split(" ").slice(0, 2).join(" ")}/10 border border-current/30 font-bold text-lg leading-none`}
      >
        <span className={color.split(" ").slice(-1)[0]}>{score}</span>
      </div>
      <span className="text-xs text-[var(--color-text-dim)]">/ 100</span>
    </div>
  );
}

function SeverityBadge({
  count,
  severity,
}: {
  count: number;
  severity: "critical" | "high" | "medium";
}) {
  const c = severityColor(severity);
  return (
    <span className={`badge ${c.bg} ${c.text} border ${c.border}`}>
      {count} {c.label}
    </span>
  );
}
