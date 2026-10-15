import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { ScanLine, Plus, Check, X, Loader2 } from "lucide-react";
import { db } from "@/db";
import { projects, scans } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const STATUS_BADGE = {
  completed: { label: "Terminé", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: Check },
  running: { label: "En cours", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", icon: Loader2 },
  queued: { label: "En file", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Loader2 },
  failed: { label: "Échec", color: "bg-red-500/10 text-red-400 border-red-500/30", icon: X },
} as const;

const TYPE_BADGE = {
  security: { label: "Sécurité", color: "bg-red-500/10 text-red-300 border-red-500/30" },
  cleanup: { label: "Nettoyage", color: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30" },
  costs: { label: "Coûts", color: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  full: { label: "Complète", color: "bg-purple-500/10 text-purple-300 border-purple-500/30" },
} as const;

export default async function ScansPage() {
  const user = await requireUser();

  const userProjects = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  // For simplicity (and since we want all scans for this user), gather per project
  const scansList: Array<{
    scan: typeof scans.$inferSelect;
    project: (typeof projects.$inferSelect) | undefined;
  }> = [];

  for (const p of userProjects) {
    const s = await db
      .select()
      .from(scans)
      .where(eq(scans.projectId, p.id))
      .orderBy(desc(scans.createdAt))
      .limit(50);
    for (const scan of s) {
      scansList.push({ scan, project: p });
    }
  }
  scansList.sort((a, b) => b.scan.createdAt.getTime() - a.scan.createdAt.getTime());

  return (
    <>
      <PageHeader
        title="Toutes les analyses"
        subtitle="Historique complet de tous les scans sur tes projets."
        actions={
          <Link href="/scan/new" className="btn-primary">
            <Plus size={16} /> Nouvelle analyse
          </Link>
        }
      />

      {scansList.length === 0 ? (
        <div className="card text-center py-16">
          <ScanLine size={36} className="mx-auto text-cyan-400 mb-3" />
          <h3 className="font-bold text-white text-lg">Aucune analyse enregistrée</h3>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Lance ta première analyse pour commencer à protéger ton code.
          </p>
          <Link href="/scan/new" className="btn-primary mt-6 inline-flex">
            <Plus size={16} /> Lancer une analyse
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#0a0a1a] border-b border-[var(--color-border)]">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-xs">
                    Projet
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-xs">
                    Type
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-xs">
                    Statut
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-xs">
                    Durée
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-xs">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold text-[var(--color-text-muted)] uppercase tracking-wide text-xs text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {scansList.map(({ scan, project }) => {
                  const status = STATUS_BADGE[scan.status];
                  const StatusIcon = status.icon;
                  const type = TYPE_BADGE[scan.type];
                  return (
                    <tr
                      key={scan.id}
                      className="border-b border-[var(--color-border)] hover:bg-[#0a0a1a]/50 transition"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        <Link
                          href={`/projects/${project?.id}`}
                          className="hover:text-cyan-300"
                        >
                          {project?.name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${type.color} border`}
                        >
                          {type.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`badge ${status.color} border inline-flex items-center gap-1`}
                        >
                          <StatusIcon
                            size={12}
                            className={
                              scan.status === "running" ? "animate-spin" : ""
                            }
                          />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {scan.durationMs
                          ? `${Math.round(scan.durationMs / 1000)}s`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)] whitespace-nowrap">
                        {formatRelativeTime(scan.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {project && (
                          <Link
                            href={`/projects/${project.id}`}
                            className="text-cyan-300 hover:text-cyan-200 text-xs font-medium"
                          >
                            Voir rapport →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
