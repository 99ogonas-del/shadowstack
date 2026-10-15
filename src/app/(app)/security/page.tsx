import Link from "next/link";
import { eq, desc, and } from "drizzle-orm";
import {
  ShieldAlert,
  KeyRound,
  ShieldCheck,
  AlertOctagon,
} from "lucide-react";
import { db } from "@/db";
import { projects, findings } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { severityColor, formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await requireUser();

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  const allFindings = await db
    .select({ finding: findings, project: projects })
    .from(findings)
    .innerJoin(projects, eq(findings.projectId, projects.id))
    .where(eq(projects.userId, user.id))
    .orderBy(desc(findings.createdAt))
    .limit(200); // pagination : on n'affiche jamais plus de 200 constats

  const critical = allFindings.filter(
    (f) => f.finding.severity === "critical" && !f.finding.fixed,
  );
  const high = allFindings.filter(
    (f) => f.finding.severity === "high" && !f.finding.fixed,
  );
  const medium = allFindings.filter(
    (f) => f.finding.severity === "medium" && !f.finding.fixed,
  );

  const secrets = allFindings.filter(
    (f) =>
      (f.finding.category === "Secrets" || f.finding.category === "Sécurité") &&
      !f.finding.fixed,
  );

  return (
    <>
      <PageHeader
        title="Sécurité"
        subtitle="Vue d'ensemble des vulnérabilités détectées sur tous tes projets."
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          icon={AlertOctagon}
          label="Critiques"
          count={critical.length}
          color="red"
        />
        <Stat
          icon={ShieldAlert}
          label="Élevées"
          count={high.length}
          color="orange"
        />
        <Stat
          icon={ShieldAlert}
          label="Moyennes"
          count={medium.length}
          color="yellow"
        />
        <Stat
          icon={KeyRound}
          label="Secrets exposés"
          count={secrets.length}
          color="purple"
        />
      </div>

      {/* All critical findings */}
      {critical.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <AlertOctagon size={18} className="text-red-400" />
            Vulnérabilités critiques
          </h3>
          <div className="space-y-2">
            {critical.map((r) => (
              <Link
                key={r.finding.id}
                href={`/projects/${r.project.id}`}
                className="block p-3 rounded-xl bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">
                      {r.finding.title}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                      {r.project.name} · {r.finding.filePath}
                      {r.finding.lineNumber ? `:${r.finding.lineNumber}` : ""}
                    </div>
                  </div>
                  <span className="badge bg-red-500/20 text-red-300 border border-red-500/30">
                    Critique
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All findings list */}
      <div className="card">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <ShieldCheck size={18} className="text-cyan-400" />
          Toutes les vulnérabilités
        </h3>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-sm">
            <thead className="bg-[#0a0a1a]/60 border-b border-[var(--color-border)]">
              <tr className="text-left">
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
                  Gravité
                </th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
                  Faille
                </th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
                  Projet
                </th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
                  Fichier
                </th>
                <th className="px-5 py-3 text-xs uppercase tracking-wide text-[var(--color-text-muted)] font-semibold">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {allFindings.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-[var(--color-text-muted)]"
                  >
                    <ShieldCheck
                      size={28}
                      className="mx-auto text-green-400 mb-2"
                    />
                    <div>Aucune vulnérabilité détectée 🎉</div>
                  </td>
                </tr>
              )}
              {allFindings.map((r) => {
                const sev = severityColor(r.finding.severity);
                return (
                  <tr
                    key={r.finding.id}
                    className="border-b border-[var(--color-border)] hover:bg-[#0a0a1a]/50 transition"
                  >
                    <td className="px-5 py-3">
                      <span className={`badge ${sev.bg} ${sev.text} border ${sev.border}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/projects/${r.project.id}`}
                        className="text-white hover:text-cyan-300"
                      >
                        {r.finding.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)]">
                      {r.project.name}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-muted)] text-xs font-mono">
                      {r.finding.filePath}
                      {r.finding.lineNumber ? `:${r.finding.lineNumber}` : ""}
                    </td>
                    <td className="px-5 py-3 text-[var(--color-text-dim)] text-xs whitespace-nowrap">
                      {formatRelativeTime(r.finding.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  count,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  count: number;
  color: "red" | "orange" | "yellow" | "purple";
}) {
  const palette = {
    red: "from-red-500/10 to-red-500/5 border-red-500/20 text-red-400",
    orange: "from-orange-500/10 to-orange-500/5 border-orange-500/20 text-orange-400",
    yellow: "from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400",
  }[color];

  return (
    <div className={`card bg-gradient-to-br ${palette} border`}>
      <Icon size={20} className="mb-2" />
      <div className="text-3xl font-bold text-white">{count}</div>
      <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mt-1">
        {label}
      </div>
    </div>
  );
}
