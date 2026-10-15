import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { Gauge, Layers, AlertCircle, Plus } from "lucide-react";
import { db } from "@/db";
import { projects, findings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function CostsPage() {
  const user = await requireUser();
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  // Findings avec impact performance/coûts (catégories réelles du moteur)
  const allFindings = await db
    .select({ finding: findings, project: projects })
    .from(findings)
    .innerJoin(projects, eq(findings.projectId, projects.id))
    .where(eq(projects.userId, user.id))
    .limit(200); // pagination : max 200 constats

  const costFindings = allFindings.filter(
    (f) =>
      !f.finding.fixed &&
      ["Performance", "Coûts IA", "Dépendances"].includes(f.finding.category),
  );

  // Répartition par catégorie — données réelles
  const byCategory = new Map<string, number>();
  for (const f of costFindings) {
    byCategory.set(
      f.finding.category,
      (byCategory.get(f.finding.category) ?? 0) + 1,
    );
  }
  const breakdown = Array.from(byCategory.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const maxCount = Math.max(1, ...breakdown.map((b) => b.count));

  return (
    <>
      <PageHeader
        title="Optimisation des coûts"
        subtitle="Les problèmes de performance et de dépendances qui pèsent sur ton projet."
        actions={
          <Link href="/scan/new" className="btn-primary">
            <Plus size={16} /> Analyser un projet
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
          <Gauge size={20} className="text-cyan-400 mb-2" />
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            Optimisations ouvertes
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {costFindings.length}
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
          <Layers size={20} className="text-purple-400 mb-2" />
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            Projets concernés
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {new Set(costFindings.map((f) => f.project.id)).size}
          </div>
        </div>
        <div className="card bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/30">
          <AlertCircle size={20} className="text-orange-400 mb-2" />
          <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
            Impact élevé
          </div>
          <div className="text-3xl font-bold text-white mt-1">
            {costFindings.filter((f) =>
              ["critical", "high"].includes(f.finding.severity),
            ).length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold text-white mb-1">Répartition par catégorie</h3>
          <p className="text-xs text-[var(--color-text-dim)] mb-4">
            Nombre de constats encore ouverts, par type.
          </p>
          <div className="space-y-3">
            {breakdown.map((b) => (
              <div key={b.label}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-[var(--color-text-muted)]">
                    {b.label}
                  </span>
                  <span className="text-white font-semibold">
                    {b.count} constat{b.count > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#0a0a1a] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all"
                    style={{ width: `${(b.count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {breakdown.length === 0 && (
              <p className="text-center py-8 text-[var(--color-text-muted)]">
                Aucun constat de performance pour le moment
              </p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="font-bold text-white mb-4">Projets concernés</h3>
          <div className="space-y-2">
            {userProjects.map((p) => {
              const projectFindings = costFindings.filter(
                (f) => f.project.id === p.id,
              );
              if (projectFindings.length === 0) return null;
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a1a] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-[var(--color-text-dim)]">
                      {projectFindings.length} optimisation
                      {projectFindings.length > 1 ? "s" : ""} à traiter
                    </div>
                  </div>
                  <span className="text-cyan-300 font-bold text-sm">
                    voir →
                  </span>
                </Link>
              );
            })}
            {costFindings.length === 0 && (
              <div className="text-center py-8 text-[var(--color-text-muted)]">
                Aucun constat pour le moment
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
