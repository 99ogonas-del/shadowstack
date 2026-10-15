"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, Lock, Loader2, CheckCircle2, KeyRound } from "lucide-react";
import { ShadowStackLogo } from "@/components/ShadowStackLogo";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) setError("Lien invalide : aucun token trouvé.");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="relative lg:w-[55%] overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#15153d] to-[#0a0a1a] p-8 lg:p-16 flex flex-col justify-between">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />

        <Link href="/" className="relative inline-flex items-center">
          <ShadowStackLogo size={44} />
          <div className="ml-3">
            <div className="text-2xl font-bold leading-tight">
              <span className="text-white">Shadow</span>
              <span className="gradient-text-cyan">Stack</span>
            </div>
            <div className="text-xs text-[var(--color-text-dim)]">
              Analyse · Sécurise · Corrige
            </div>
          </div>
        </Link>

        <div className="relative max-w-xl mt-12 lg:mt-0">
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-white">
            Nouveau
            <br />
            <span className="gradient-text-cyan">mot de passe.</span>
          </h1>
          <p className="mt-5 text-[var(--color-text-muted)] leading-relaxed max-w-md">
            Choisis un mot de passe solide — 8 caractères minimum. Toutes tes
            sessions actuelles seront fermées par sécurité.
          </p>
        </div>
      </div>

      <div className="lg:w-[45%] flex items-center justify-center p-8 bg-[var(--color-bg)]">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-white transition mb-8"
          >
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>

          {done ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-5">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Mot de passe mis à jour
              </h2>
              <p className="text-[var(--color-text-muted)] mb-6">
                Tu peux maintenant te connecter. Redirection en cours...
              </p>
              <Link href="/login" className="btn-primary w-full justify-center">
                Se connecter
              </Link>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-5">
                <KeyRound size={22} className="text-cyan-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Définir un nouveau mot de passe
              </h2>
              <p className="text-[var(--color-text-muted)] mb-8">
                Ce lien est à usage unique et expire dans 30 minutes.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Nouveau mot de passe</label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                    />
                    <input
                      type="password"
                      className="input !pl-10"
                      placeholder="8 caractères minimum"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                    />
                    <input
                      type="password"
                      className="input !pl-10"
                      placeholder="Répète le mot de passe"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                {error && <div className="alert alert-error text-sm">{error}</div>}

                <button
                  type="submit"
                  className="btn-primary w-full justify-center"
                  disabled={loading || !token}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Mise à jour...
                    </>
                  ) : (
                    "Mettre à jour"
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
