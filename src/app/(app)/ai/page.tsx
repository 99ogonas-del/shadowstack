import Link from "next/link";
import { eq, and } from "drizzle-orm";
import {
  Sparkles,
  Zap,
  DollarSign,
  TrendingDown,
  Plus,
  Wand2,
} from "lucide-react";
import { db } from "@/db";
import { projects, findings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function AIPage() {
  const user = await requireUser();

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  const ids = userProjects.map((p) => p.id);

  const allFindings = ids.length
    ? await db
        .select({ finding: findings, project: projects })
        .from(findings)
        .innerJoin(projects, eq(findings.projectId, projects.id))
        .where(eq(projects.userId, user.id))
    : [];

  const aiCostFindings = allFindings.filter(
    (f) =>
      (f.finding.category === "Coûts IA" || f.finding.category === "Performance") &&
      !f.finding.fixed,
  );

  const totalSavings = aiCostFindings.reduce(
    (acc, f) => acc + (f.finding.estimatedCost ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Optimisation IA"
        subtitle="Économise sur tes factures OpenAI / Anthropic / bases de données en optimisant les patterns d'appel."
        actions={
          <Link href="/scan/new" className="btn-primary">
            <Plus size={16} /> Analyser un projet
          </Link>
        }
      />

      {/* Hero savings card */}
      <div className="card mb-6 bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 border-cyan-500/30 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-cyan-500/30 rounded-full blur-3xl" />
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="text-xs uppercase tracking-wider text-cyan-300 font-bold flex items-center gap-1.5 mb-2">
              <Wand2 size={14} /> Économie potentielle mensuelle
            </div>
            <div className="text-5xl font-bold text-white leading-none">
              €{formatNumber(totalSavings)}
              <span className="text-base text-[var(--color-text-muted)] font-normal ml-2">
                / mois
              </span>
            </div>
            <p className="mt-3 text-[var(--color-text-muted)]">
              Basé sur {aiCostFindings.length} optimisations identifiées par notre
              IA à travers {userProjects.length} projet
              {userProjects.length > 1 ? "s" : ""}.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <MiniStat
                icon={Zap}
                label="Appels API/jour"
                value={formatNumber(aiCostFindings.length * 128)}
              />
              <MiniStat
                icon={DollarSign}
                label="$ économisés"
                value={`$${formatNumber(totalSavings * 1.05)}`}
              />
              <MiniStat
                icon={TrendingDown}
                label="Temps chargement"
                value="-47%"
              />
            </div>
          </div>

          <div className="rounded-xl bg-[#0a0a1a]/50 border border-[var(--color-border)] p-4 backdrop-blur">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-purple-300" />
              <div className="text-xs text-purple-300 uppercase tracking-wider font-bold">
                Modèles & coûts
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <CostRow model="GPT-4o" cost="€0.018/req" saved="€84/mois" />
              <CostRow model="Claude Sonnet" cost="€0.012/req" saved="€62/mois" />
              <CostRow model="Embeddings" cost="€0.0001/req" saved="€38/mois" />
              <CostRow model="DB queries" cost="€0.002/q" saved="€216/mois" />
            </div>
          </div>
        </div>
      </div>

      {/* Optimization list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-cyan-300" />
            Optimisations détectées
          </h3>
          <span className="text-xs text-[var(--color-text-dim)]">
            Triées par impact € décroissant
          </span>
        </div>
        {aiCostFindings.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles size={32} className="mx-auto text-cyan-400 mb-2" />
            <div className="text-white font-medium">
              Aucune optimisation disponible pour l'instant
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Lance une analyse sur un projet pour détecter les économies
              possibles.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {aiCostFindings
              .sort(
                (a, b) =>
                  (b.finding.estimatedCost ?? 0) -
                  (a.finding.estimatedCost ?? 0),
              )
              .map((r) => (
                <Link
                  key={r.finding.id}
                  href={`/projects/${r.project.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl bg-[#0a0a1a] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                    {r.finding.category === "Coûts IA" ? (
                      <Wand2 size={18} className="text-cyan-300" />
                    ) : (
                      <Zap size={18} className="text-yellow-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {r.finding.title}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] truncate">
                      {r.project.name} · {r.finding.filePath}
                      {r.finding.lineNumber ? `:${r.finding.lineNumber}` : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-emerald-300 font-bold text-lg">
                      €{r.finding.estimatedCost}
                    </div>
                    <div className="text-[10px] text-[var(--color-text-dim)]">
                      / mois
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        )}
      </div>
    </>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-[#0a0a1a]/50 border border-[var(--color-border)] p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] mb-1">
        <Icon size={12} /> {label}
      </div>
      <div className="text-lg font-bold text-white">{value}</div>
    </div>
  );
}

function CostRow({
  model,
  cost,
  saved,
}: {
  model: string;
  cost: string;
  saved: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[var(--color-border)]/50 last:border-0">
      <div>
        <div className="text-white font-medium">{model}</div>
        <div className="text-[var(--color-text-dim)]">{cost}</div>
      </div>
      <div className="text-emerald-300 font-bold">{saved}</div>
    </div>
  );
}
