import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import {
  ShieldAlert,
  KeyRound,
  PackageOpen,
  Sparkles,
  TrendingUp,
  Plus,
  ArrowRight,
  Activity as ActivityIcon,
  Rocket,
  Code,
  UploadCloud,
  Trash2,
  Eye,
} from "lucide-react";
import { db } from "@/db";
import { projects, scans, findings, activity } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import {
  formatRelativeTime,
  severityColor,
  formatNumber,
} from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";
import { HealthScoreRing } from "@/components/HealthScoreRing";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();

  // Fetch projects
  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(desc(projects.createdAt));

  // Aggregate findings across all user projects
  const allFindings = await db
    .select()
    .from(findings);

  // Active = projects with findings
  const userProjectIds = new Set(userProjects.map((p) => p.id));
  const userFindings = allFindings.filter((f) => userProjectIds.has(f.projectId));

  const counts = {
    critical: userFindings.filter((f) => f.severity === "critical" && !f.fixed).length,
    high: userFindings.filter((f) => f.severity === "high" && !f.fixed).length,
    medium: userFindings.filter((f) => f.severity === "medium" && !f.fixed).length,
    exposedKeys: userFindings.filter((f) => f.category === "Secrets" && !f.fixed).length,
    outdatedDeps: userFindings.filter((f) => f.category === "Dépendances" && !f.fixed).length,
    totalCost: userFindings.reduce((acc, f) => acc + (f.estimatedCost ?? 0), 0),
    total: userFindings.filter((f) => !f.fixed).length,
    fixed: userFindings.filter((f) => f.fixed).length,
  };

  // Average health score (only if there are projects)
  const avgScore =
    userProjects.length === 0
      ? 0
      : Math.round(
          userProjects.reduce((s, p) => s + p.healthScore, 0) /
            userProjects.length,
        );

  // Recent activity
  const recentActivity = await db
    .select()
    .from(activity)
    .where(eq(activity.userId, user.id))
    .orderBy(desc(activity.createdAt))
    .limit(6);

  // Recent projects with their latest scan
  const recentProjects = userProjects.slice(0, 4);

  // Recent findings
  const recentFindingsRaw = await db
    .select({
      finding: findings,
      project: projects,
    })
    .from(findings)
    .innerJoin(projects, eq(findings.projectId, projects.id))
    .where(eq(projects.userId, user.id))
    .orderBy(desc(findings.createdAt))
    .limit(5);
  const recentFindings = recentFindingsRaw.filter((r) => !r.finding.fixed);

  // Scores des projets ( PAS une évolution temporelle : ce sont les
  // scores actuels des derniers projets analysés )
  const scoreTrend = userProjects.slice(0, 7).map((p) => ({
    label: p.name.slice(0, 4),
    score: p.healthScore,
  }));

  return (
    <>
      <PageHeader
        title={`Salut ${user.name.split(" ")[0]} 👋`}
        subtitle="Voici la santé globale de tes projets."
        actions={
          <>
            <Link href="/projects" className="btn-secondary">
              Voir les projets
            </Link>
            <Link href="/scan/new" className="btn-primary">
              <Plus size={16} /> Nouvelle analyse
            </Link>
          </>
        }
      />

      {userProjects.length === 0 ? (
        <EmptyDashboard userName={user.name} />
      ) : (
        <>
          {/* Top KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="card lg:col-span-2">
              <div className="flex items-center gap-6">
                <HealthScoreRing score={avgScore} size={140} />
                <div className="flex-1">
                  <div className="text-xs uppercase tracking-wider text-[var(--color-text-dim)] font-semibold">
                    Santé globale
                  </div>
                  <div className="text-lg font-bold text-white mt-1">
                    {avgScore >= 75 ? "Tout va bien" : avgScore >= 60 ? "À surveiller" : "Action requise"}
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mt-2">
                    Basé sur {userProjects.length} projet
                    {userProjects.length > 1 ? "s" : ""} et {userFindings.length} analyse
                    {userFindings.length > 1 ? "s" : ""}.
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-[var(--color-text-muted)]">
                        {counts.fixed} corrigés
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-[var(--color-text-muted)]">
                        {counts.total} à corriger
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <KpiCard
              icon={KeyRound}
              label="Clés API exposées"
              value={counts.exposedKeys}
              color={counts.exposedKeys > 0 ? "red" : "green"}
              hint={counts.exposedKeys > 0 ? "Action immédiate" : "Aucun risque"}
            />
            <KpiCard
              icon={PackageOpen}
              label="Dépendances obsolètes"
              value={counts.outdatedDeps}
              color={counts.outdatedDeps > 0 ? "orange" : "green"}
              hint={counts.outdatedDeps > 0 ? "Patchs dispos" : "À jour"}
            />
            <KpiCard
              icon={Sparkles}
              label="Économie IA / mois"
              value={`€${counts.totalCost}`}
              color="purple"
              hint={counts.totalCost > 0 ? "Si corrigé" : "Optimisé"}
            />
          </div>

          {/* Two-col layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left col */}
            <div className="lg:col-span-2 space-y-6">
              {/* Critical / high severity card */}
              {(counts.critical > 0 || counts.high > 0) && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={18} className="text-red-400" />
                      <h3 className="font-bold text-white">Failles prioritaires</h3>
                    </div>
                    <span className="badge bg-red-500/10 text-red-400 border border-red-500/30">
                      {counts.critical + counts.high} critiques
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <SeverityPill count={counts.critical} severity="critical" />
                    <SeverityPill count={counts.high} severity="high" />
                    <SeverityPill count={counts.medium} severity="medium" />
                  </div>
                  <div className="space-y-2">
                    {recentFindings.slice(0, 4).map((r) => {
                      const c = severityColor(r.finding.severity);
                      return (
                        <Link
                          key={r.finding.id}
                          href={`/projects/${r.project.id}`}
                          className="flex items-start gap-3 p-3 rounded-xl bg-[#0a0a1a] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition"
                        >
                          <span
                            className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${c.text.replace("text-", "bg-")}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white truncate">
                              {r.finding.title}
                            </div>
                            <div className="text-xs text-[var(--color-text-dim)] mt-0.5">
                              {r.project.name} · {r.finding.filePath}
                              {r.finding.lineNumber ? `:${r.finding.lineNumber}` : ""}
                            </div>
                          </div>
                          <span className={`badge ${c.bg} ${c.text} border ${c.border}`}>
                            {c.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                  {recentFindings.length > 0 && (
                    <Link
                      href="/security"
                      className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan-300 hover:text-cyan-200 font-medium"
                    >
                      Voir le rapport complet <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              )}

              {/* Projects */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Projets récents</h3>
                  <Link
                    href="/projects"
                    className="text-xs text-cyan-300 hover:text-cyan-200 font-medium"
                  >
                    Tout voir
                  </Link>
                </div>
                <div className="space-y-2">
                  {recentProjects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      className="flex items-center gap-4 p-3 rounded-xl bg-[#0a0a1a] border border-[var(--color-border)] hover:border-[var(--color-border-light)] transition"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        {p.source === "github" ? (
                          <Code size={18} className="text-cyan-300" />
                        ) : (
                          <UploadCloud size={18} className="text-purple-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">
                          {p.name}
                        </div>
                        <div className="text-xs text-[var(--color-text-dim)] truncate">
                          {p.framework} · {p.language}
                        </div>
                      </div>
                      <ScoreBadge score={p.healthScore} />
                      <ArrowRight
                        size={16}
                        className="text-[var(--color-text-dim)]"
                      />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Score trend chart */}
              {scoreTrend.length > 0 && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-white">Score par projet</h3>
                      <p className="text-xs text-[var(--color-text-dim)] mt-0.5">
                        Score de santé actuel — {userProjects.length} projet{userProjects.length > 1 ? "s" : ""}
                      </p>
                    </div>
                    <TrendingUp size={16} className="text-cyan-400" />
                  </div>
                  <div className="flex items-end gap-2 h-32">
                    {scoreTrend.map((s, i) => (
                      <div
                        key={i}
                        className="flex-1 flex flex-col items-center gap-1 group"
                      >
                        <div className="text-[10px] text-[var(--color-text-dim)] opacity-0 group-hover:opacity-100 transition">
                          {s.score}
                        </div>
                        <div
                          className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/40 to-cyan-400 hover:to-cyan-300 transition-all"
                          style={{ height: `${(s.score / 100) * 100}%` }}
                        />
                        <div className="text-[10px] text-[var(--color-text-dim)] truncate w-full text-center">
                          {s.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right col */}
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-bold text-white mb-3">
                  Lancer une analyse
                </h3>
                <div className="space-y-2">
                  <Link
                    href="/scan/new"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-400 transition"
                  >
                    <Code size={18} className="text-cyan-300" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        Connecter GitHub
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Analyse un dépôt en quelques secondes
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-cyan-300" />
                  </Link>
                  <Link
                    href="/scan/new?mode=zip"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 hover:border-purple-400 transition"
                  >
                    <UploadCloud size={18} className="text-purple-300" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        Importer un ZIP
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Depuis un fichier .zip local
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-purple-300" />
                  </Link>
                  <Link
                    href="/scan/new?mode=manual"
                    className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/30 hover:border-blue-400 transition"
                  >
                    <Rocket size={18} className="text-blue-300" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">
                        Coller du code
                      </div>
                      <div className="text-xs text-[var(--color-text-muted)]">
                        Collez un snippet pour le tester
                      </div>
                    </div>
                    <ArrowRight size={14} className="text-blue-300" />
                  </Link>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <ActivityIcon size={16} className="text-cyan-400" />
                    Activité récente
                  </h3>
                </div>
                <div className="space-y-3">
                  {recentActivity.length === 0 && (
                    <div className="text-sm text-[var(--color-text-dim)] text-center py-6">
                      Aucune activité pour le moment.
                    </div>
                  )}
                  {recentActivity.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start gap-3 text-sm slide-in"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[var(--color-text-muted)] truncate">
                          {a.message}
                        </div>
                        <div className="text-xs text-[var(--color-text-dim)] mt-0.5">
                          {formatRelativeTime(a.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string | number;
  color: "red" | "orange" | "green" | "purple";
  hint: string;
}) {
  const palette = {
    red: { bg: "from-red-500/10 to-red-500/5", icon: "text-red-400", border: "border-red-500/20" },
    orange: { bg: "from-orange-500/10 to-orange-500/5", icon: "text-orange-400", border: "border-orange-500/20" },
    green: { bg: "from-green-500/10 to-green-500/5", icon: "text-green-400", border: "border-green-500/20" },
    purple: { bg: "from-purple-500/10 to-purple-500/5", icon: "text-purple-400", border: "border-purple-500/20" },
  }[color];

  return (
    <div className={`card bg-gradient-to-br ${palette.bg} ${palette.border}`}>
      <Icon size={18} className={`${palette.icon} mb-2`} />
      <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
        {label}
      </div>
      <div className="text-2xl font-bold text-white mt-1">{value}</div>
      <div className="text-xs text-[var(--color-text-dim)] mt-1">{hint}</div>
    </div>
  );
}

function SeverityPill({
  count,
  severity,
}: {
  count: number;
  severity: "critical" | "high" | "medium";
}) {
  const c = severityColor(severity);
  return (
    <div
      className={`p-3 rounded-xl ${c.bg} border ${c.border} flex flex-col items-center`}
    >
      <div className={`text-2xl font-bold ${c.text}`}>{count}</div>
      <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mt-1">
        {c.label}
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90
      ? "text-green-400 border-green-500/30 bg-green-500/10"
      : score >= 75
      ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
      : score >= 60
      ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
      : "text-red-400 border-red-500/30 bg-red-500/10";

  return (
    <div className={`px-3 py-1.5 rounded-lg border ${color} flex items-center gap-1.5 shrink-0`}>
      <span className="font-bold text-sm">{score}</span>
      <span className="text-[10px] opacity-70">/100</span>
    </div>
  );
}

function EmptyDashboard({ userName }: { userName: string }) {
  return (
    <div className="card text-center py-16 fade-in">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 mb-6">
        <Sparkles size={32} className="text-cyan-300" />
      </div>
      <h2 className="text-2xl font-bold text-white">
        Bienvenue {userName.split(" ")[0]}, prêt à nettoyer tes projets ?
      </h2>
      <p className="mt-2 text-[var(--color-text-muted)] max-w-md mx-auto">
        Connecte un dépôt GitHub, importe un ZIP, ou colle directement du code
        pour démarrer ta première analyse.
      </p>
      <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
        <Link href="/scan/new" className="btn-primary">
          <Rocket size={16} /> Lancer ma première analyse
        </Link>
        <Link href="/projects" className="btn-secondary">
          <Eye size={16} /> Voir les exemples
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
        {[
          { icon: Code, title: "Connecter un repo GitHub", desc: "Analyse instantanée" },
          { icon: UploadCloud, title: "Importer un fichier .zip", desc: "Jusqu'à 50MB" },
          { icon: Trash2, title: "Corriger en 1-clic", desc: "Patches IA prêts à coller" },
        ].map((f) => (
          <div
            key={f.title}
            className="p-4 rounded-xl bg-[#0a0a1a] border border-[var(--color-border)]"
          >
            <f.icon size={20} className="text-cyan-400 mb-2" />
            <div className="font-medium text-white text-sm">{f.title}</div>
            <div className="text-xs text-[var(--color-text-dim)] mt-1">
              {f.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
