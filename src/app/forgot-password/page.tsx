"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { ShadowStackLogo } from "@/components/ShadowStackLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailWasSent, setEmailWasSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur");
      setSent(true);
      setEmailWasSent(Boolean(data.emailSent));
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* panneau visuel gauche */}
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
            Pas de panique,
            <br />
            <span className="gradient-text-cyan">ça arrive à tout le monde.</span>
          </h1>
          <p className="mt-5 text-[var(--color-text-muted)] leading-relaxed max-w-md">
            On t&apos;envoie un lien pour définir un nouveau mot de passe.
            Il expire dans 30 minutes.
          </p>
        </div>
      </div>

      {/* panneau formulaire droite */}
      <div className="lg:w-[45%] flex items-center justify-center p-8 bg-[var(--color-bg)]">
        <div className="w-full max-w-md">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-white transition mb-8"
          >
            <ArrowLeft size={16} /> Retour à la connexion
          </Link>

          {sent ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-5">
                <CheckCircle2 size={26} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Vérifie ta boîte mail
              </h2>
              <p className="text-[var(--color-text-muted)] mb-6">
                Si un compte existe pour <strong>{email}</strong>,{" "}
                {emailWasSent
                  ? "un email avec le lien de réinitialisation vient d'être envoyé."
                  : "un lien de réinitialisation vient d'être généré."}{" "}
                Pense à regarder dans les spams.
              </p>

              {devUrl && (
                <div className="mb-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/30 text-left">
                  <p className="text-xs font-semibold text-amber-300 uppercase tracking-wide mb-2">
                    Mode développement
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mb-3">
                    Aucun email n&apos;est envoyé sur ce déploiement. Voici le
                    lien direct :
                  </p>
                  <Link
                    href={devUrl}
                    className="text-sm text-cyan-300 hover:text-cyan-200 break-all underline"
                  >
                    {devUrl}
                  </Link>
                </div>
              )}

              <Link href="/login" className="btn-primary w-full justify-center">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-2">
                Mot de passe oublié
              </h2>
              <p className="text-[var(--color-text-muted)] mb-8">
                Entre ton email, on s&apos;occupe du reste.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">Email</label>
                  <div className="relative">
                    <Mail
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                    />
                    <input
                      type="email"
                      className="input !pl-10"
                      placeholder="toi@shadowstack.app"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="alert alert-error text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full justify-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="spinner" /> Envoi...
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
                Tu t&apos;en souviens finalement ?{" "}
                <Link
                  href="/login"
                  className="text-cyan-300 hover:text-cyan-200 font-medium"
                >
                  Se connecter
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
