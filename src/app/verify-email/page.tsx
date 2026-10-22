"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import {
  ArrowLeft,
  MailCheck,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { ShadowStackLogo } from "@/components/ShadowStackLogo";

function VerifyForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!token) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        { method: "GET" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setError("Lien invalide : aucun token trouvé dans l'URL.");
      return;
    }
    handleVerify();
    // Le token ne change pas pendant la vie du composant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
            Confirme ton
            <br />
            <span className="gradient-text-cyan">adresse email.</span>
          </h1>
          <p className="mt-5 text-[var(--color-text-muted)] leading-relaxed max-w-md">
            Active toutes les fonctionnalités de ton compte en vérifiant ton
            adresse. Le lien reçu par email est valable 24 heures.
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
                Email vérifié
              </h2>
              <p className="text-[var(--color-text-muted)] mb-6">
                Ton compte est maintenant activé. Tu peux te connecter.
              </p>
              <Link href="/login" className="btn-primary w-full justify-center">
                Se connecter
              </Link>
            </div>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-5">
                <MailCheck size={22} className="text-cyan-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Vérification de l'email
              </h2>
              <p className="text-[var(--color-text-muted)] mb-8">
                {token
                  ? "On confirme ton adresse en quelques secondes."
                  : "Ce lien est invalide ou a expiré."}
              </p>

              {error ? (
                <div className="alert alert-error text-sm mb-4">{error}</div>
              ) : null}

              <button
                type="button"
                onClick={handleVerify}
                className="btn-primary w-full justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinner" /> Vérification...
                  </>
                ) : error ? (
                  "Réessayer"
                ) : (
                  "Vérifier mon email"
                )}
              </button>

              <p className="mt-4 text-xs text-[var(--color-text-dim)] text-center">
                {error ? (
                  <>
                    Le lien a expiré ou ne fonctionne pas ?{" "}
                    <Link href="/login" className="text-cyan-400 hover:underline">
                      Reconnecte-toi
                    </Link>{" "}
                    pour en recevoir un nouveau.
                  </>
                ) : (
                  <>
                    <AlertTriangle
                      size={12}
                      className="inline -mt-px mr-1"
                    />{" "}
                    Rien reçu ? Vérifie tes spam, ou reconnecte-toi pour
                    demander un nouvel email.
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyForm />
    </Suspense>
  );
}
