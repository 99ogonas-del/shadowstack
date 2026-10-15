"use client";

import { useState, useEffect } from "react";
import {
  Users,
  FolderKanban,
  ShieldCheck,
  ScanLine,
  Crown,
  Loader2,
  AlertTriangle,
} from "lucide-react";

type AdminStats = {
  users: number;
  verifiedUsers: number;
  admins: number;
  projects: number;
  scans: number;
  findings: number;
  findingsBySeverity: Record<string, number>;
  planBreakdown: Record<string, number>;
  recentSignups: Array<{
    id: string;
    email: string;
    name: string;
    plan: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
  }>;
  requestedBy: string;
};

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/stats");
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d.error ?? `Erreur ${res.status}`);
        }
        setStats(await res.json());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="card text-center py-16 text-[var(--color-text-muted)]">
        <Loader2 size={26} className="animate-spin mx-auto mb-3 text-cyan-300" />
        Chargement des statistiques...
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="card border-red-500/40 text-red-300 text-sm">
        Erreur : {error}
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-blue-400",
  };

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Utilisateurs" value={stats.users} sub={`${stats.verifiedUsers} emails vérifiés`} />
        <Kpi icon={FolderKanban} label="Projets" value={stats.projects} />
        <Kpi icon={ScanLine} label="Analyses" value={stats.scans} />
        <Kpi icon={ShieldCheck} label="Failles détectées" value={stats.findings} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Répartition des failles */}
        <div className="card">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
            <AlertTriangle size={15} className="text-orange-400" />
            Failles par sévérité
          </h3>
          {Object.keys(stats.findingsBySeverity).length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Aucune faille détectée.</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.findingsBySeverity).map(([sev, n]) => (
                <div key={sev} className="flex items-center justify-between">
                  <span className={`text-sm font-medium capitalize ${severityColors[sev] ?? "text-white"}`}>
                    {sev}
                  </span>
                  <span className="text-sm text-white font-bold">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Répartition des plans */}
        <div className="card">
          <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
            <Crown size={15} className="text-yellow-400" />
            Plans des utilisateurs
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.planBreakdown).map(([plan, n]) => (
              <div key={plan} className="flex items-center justify-between">
                <span className="text-sm text-[var(--color-text-muted)] capitalize">{plan}</span>
                <span className="text-sm text-white font-bold">{n}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2">
              <span className="text-sm text-cyan-300">Admins</span>
              <span className="text-sm text-white font-bold">{stats.admins}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Derniers inscrits */}
      <div className="card">
        <h3 className="font-bold text-white text-sm mb-3">Derniers comptes créés</h3>
        <div className="space-y-2">
          {stats.recentSignups.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-[#0a0a1a] border border-[var(--color-border)]"
            >
              <div className="min-w-0">
                <div className="text-sm text-white font-medium truncate">{u.email}</div>
                <div className="text-xs text-[var(--color-text-dim)]">
                  {u.name} · inscrit le {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {u.role === "admin" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-semibold">
                    admin
                  </span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 capitalize">
                  {u.plan}
                </span>
                <span className={`text-xs ${u.emailVerified ? "text-green-400" : "text-orange-400"}`}>
                  {u.emailVerified ? "vérifié" : "non vérifié"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center">
          <Icon size={15} className="text-cyan-300" />
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-dim)] mt-1">{sub}</div>}
    </div>
  );
}
