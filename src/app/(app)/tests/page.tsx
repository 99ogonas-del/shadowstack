"use client";

import { useState, useEffect } from "react";
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type TestResult = {
  id: string;
  rule: string;
  kind: "positif" | "négatif";
  passed: boolean;
  detail: string;
  findingsCount: number;
};

type TestReport = {
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
  durationMs: number;
};

export default function TestsPage() {
  const [report, setReport] = useState<TestReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function runTests() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tests/run");
      if (!res.ok) throw new Error("Erreur serveur");
      setReport(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    runTests();
  }, []);

  const allPassed = report && report.failed === 0;

  return (
    <>
      <PageHeader
        title="Tests du moteur"
        subtitle="Chaque test exécute le vrai moteur d'analyse sur du code vulnérable connu et vérifie que la bonne règle se déclenche."
        actions={
          <button
            onClick={runTests}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Relancer
          </button>
        }
      />

      {/* Résumé */}
      {report && (
        <div
          className={`card mb-4 flex flex-wrap items-center gap-4 ${
            allPassed
              ? "border-green-500/40"
              : "border-red-500/40"
          }`}
        >
          <div
            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
              allPassed
                ? "bg-green-500/15 text-green-400"
                : "bg-red-500/15 text-red-400"
            }`}
          >
            {allPassed ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
          </div>
          <div>
            <div className="font-bold text-white text-lg">
              {report.passed} / {report.total} tests passés
            </div>
            <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
              <Clock size={12} /> exécutés en {report.durationMs} ms
              {!allPassed && (
                <span className="text-red-400 ml-2">
                  — {report.failed} échec(s)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="card border-red-500/40 text-red-300 text-sm mb-4">
          Erreur : {error}
        </div>
      )}

      {loading && !report && (
        <div className="card text-center py-16 text-[var(--color-text-muted)]">
          <Loader2 size={28} className="animate-spin mx-auto mb-3 text-cyan-300" />
          Exécution des tests du moteur...
        </div>
      )}

      {/* Détail des tests */}
      {report && (
        <div className="space-y-2">
          {report.results.map((t) => (
            <div
              key={t.id}
              className={`card flex items-center gap-3 p-3 ${
                t.passed
                  ? "border-[var(--color-border)]"
                  : "border-red-500/40 bg-red-500/5"
              }`}
            >
              {t.passed ? (
                <CheckCircle2
                  size={18}
                  className="text-green-400 shrink-0"
                />
              ) : (
                <XCircle size={18} className="text-red-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white text-sm">
                    {t.id}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      t.kind === "positif"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "bg-purple-500/15 text-purple-300"
                    }`}
                  >
                    {t.kind}
                  </span>
                  <code className="text-xs text-[var(--color-text-dim)]">
                    {t.rule}
                  </code>
                </div>
                <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                  {t.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explication pédagogique */}
      <div className="card mt-6">
        <div className="flex items-center gap-2 mb-2">
          <FlaskConical size={16} className="text-cyan-300" />
          <h3 className="font-bold text-white text-sm">
            Comment ça marche
          </h3>
        </div>
        <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
          Un test <strong className="text-cyan-300">positif</strong> envoie du
          code contenant une vraie faille (clé Stripe en dur, injection SQL,
          eval, etc.) et vérifie que le moteur la détecte. Un test{" "}
          <strong className="text-purple-300">négatif</strong> envoie du code
          sain et vérifie qu&apos;aucune fausse alerte n&apos;est levée — aussi
          important que la détection. Si une règle est modifiée et casse un
          cas, le test correspondant échoue ici.
        </p>
      </div>
    </>
  );
}
