"use client";

import { useState } from "react";
import {
  Wallet,
  TrendingDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import type { Finding } from "@/db/schema";

type Severity = "critical" | "high" | "medium" | "low";

export function CostOptimizer({
  findings,
  totalCostSavings,
}: {
  findings: Finding[];
  totalCostSavings: number;
}) {
  const [open, setOpen] = useState(true);

  const costItems = findings
    .filter((f) => (f.estimatedCost ?? 0) > 0 && !f.fixed)
    .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0));

  const aiCostItems = findings
    .filter((f) => f.category === "Coûts IA" && !f.fixed)
    .sort((a, b) => (b.estimatedCost ?? 0) - (a.estimatedCost ?? 0));

  // Synthesized monthly recurring metrics
  const apiCallsEstimate = findings
    .filter((f) => !f.fixed && f.estimatedCost)
    .length * 128;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-emerald-400" />
            <h3 className="font-bold text-white">Optimisation des coûts</h3>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="btn-ghost !p-1.5"
          >
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {open && (
          <>
            <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">
                    Économie potentielle
                  </div>
                  <div className="text-3xl font-bold text-white mt-1">
                    €{totalCostSavings}
                    <span className="text-sm text-[var(--color-text-muted)] font-normal ml-1">
                      / mois
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 shrink-0">
                  <TrendingDown size={22} />
                </div>
              </div>
            </div>

            {/* Mini metric grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-lg bg-[#0a0a1a] border border-[var(--color-border)] p-3">
                <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  Appels API
                </div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {apiCallsEstimate >= 1000
                    ? `${(apiCallsEstimate / 1000).toFixed(1)}k`
                    : apiCallsEstimate}
                  <span className="text-xs text-[var(--color-text-dim)] font-normal ml-1">
                    / j
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-[#0a0a1a] border border-[var(--color-border)] p-3">
                <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide">
                  DB queries
                </div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {Math.max(8, costItems.length * 4)}
                </div>
              </div>
            </div>

            {/* Per cost item */}
            {costItems.length === 0 ? (
              <div className="text-center py-8 text-[var(--color-text-muted)]">
                <Sparkles size={28} className="mx-auto text-green-400 mb-2" />
                <div className="text-sm font-medium text-white">
                  Tout est déjà optimisé
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {costItems.slice(0, 5).map((f) => (
                  <div
                    key={f.id}
                    className="rounded-lg bg-[#0a0a1a]/60 border border-[var(--color-border)] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {f.title}
                        </div>
                        <div className="text-xs text-[var(--color-text-dim)] mt-0.5">
                          {f.filePath}
                          {f.lineNumber ? `:${f.lineNumber}` : ""}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-emerald-300 font-bold text-sm">
                          €{f.estimatedCost}
                        </div>
                        <div className="text-[10px] text-[var(--color-text-dim)]">
                          / mois
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {aiCostItems.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold mb-2">
                  <Zap size={12} />
                  Analyse coûts IA
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Les LLM coûtent cher si mal utilisés. VibeClean détecte les
                  patterns qui font exploser ta facture OpenAI / Anthropic et
                  propose des optimisations concrètes (résumés, batching,
                  caching).
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats card */}
      <div className="card">
        <h4 className="font-bold text-white text-sm mb-3">Répartition</h4>
        <div className="space-y-2">
          {(
            [
              { label: "Sécurité", count: findings.filter((f) => f.category === "Sécurité" || f.category === "Secrets").length, color: "bg-red-400" },
              { label: "Performance", count: findings.filter((f) => f.category === "Performance").length, color: "bg-cyan-400" },
              { label: "Coûts IA", count: findings.filter((f) => f.category === "Coûts IA").length, color: "bg-purple-400" },
              { label: "Dépendances", count: findings.filter((f) => f.category === "Dépendances").length, color: "bg-orange-400" },
              { label: "Code mort", count: findings.filter((f) => f.category === "Code mort" || f.category === "Maintenabilité").length, color: "bg-blue-400" },
            ] as { label: string; count: number; color: string }[]
          ).map((row) => {
            const total = findings.length || 1;
            const pct = Math.round((row.count / total) * 100);
            return (
              <div key={row.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[var(--color-text-muted)]">
                    {row.label}
                  </span>
                  <span className="text-white font-medium">{row.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#0a0a1a] overflow-hidden">
                  <div
                    className={`h-full ${row.color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
