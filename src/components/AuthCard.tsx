"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { ShadowStackLogo } from "@/components/ShadowStackLogo";

export function AuthCard({ mode: initialMode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const body: Record<string, string> = { email, password };
      if (mode === "signup") body.name = name;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erreur inconnue");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError("Erreur réseau. Réessaie.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left visual panel */}
      <div className="relative lg:w-[55%] overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#15153d] to-[#0a0a1a] p-8 lg:p-16 flex flex-col justify-between">
        {/* Animated gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-3xl" />

        <div className="relative">
          <Link href="/" className="inline-flex items-center">
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
        </div>

        <div className="relative max-w-xl mt-12 lg:mt-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold mb-6">
            <Sparkles size={12} />
            Pour les devs & vibe coders
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            Transformez votre{" "}
            <span className="gradient-text">vibe coding</span>
            <br />
            en projets{" "}
            <span className="gradient-text-cyan">propres, sécurisés</span>
            <br />
            et <span className="gradient-text">maintenables</span>.
          </h1>
          <p className="mt-5 text-[var(--color-text-muted)] leading-relaxed max-w-md">
            ShadowStack analyse, nettoie et sécurise vos projets générés par l'IA.
            Gagnez du temps, évitez les erreurs et concentrez-vous sur l'essentiel
            : créer.
          </p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            {[
              { icon: Zap, title: "Code plus propre", desc: "Suppression des imports morts, variables inutiles et duplications" },
              { icon: Shield, title: "Plus de sécurité", desc: "Détection des secrets, failles d'auth et dépendances vulnérables" },
              { icon: Sparkles, title: "Moins de bugs", desc: "Patterns piégeux typiques des LLM identifiés et corrigés" },
              { icon: CheckCircle2, title: "Meilleure productivité", desc: "Suggestions de refactoring IA qui respectent votre style" },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition"
              >
                <f.icon size={18} className="text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-white">
                    {f.title}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-10 lg:mt-0 flex items-center gap-6 text-xs text-[var(--color-text-dim)]">
          <div>+500 projets nettoyés cette semaine</div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-[var(--color-border-light)]" />
          <div className="hidden sm:block">4.9/5 sur les correctifs IA</div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="lg:w-[45%] flex items-center justify-center p-6 lg:p-12 bg-[#0a0a1a]">
        <div className="w-full max-w-md">
          <div className="card fade-in">
            <div className="flex p-1 bg-[#0a0a1a] rounded-xl border border-[var(--color-border)] mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg"
                    : "text-[var(--color-text-muted)] hover:text-white"
                }`}
                type="button"
              >
                Connexion
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg"
                    : "text-[var(--color-text-muted)] hover:text-white"
                }`}
                type="button"
              >
                Inscription
              </button>
            </div>

            <h2 className="text-xl font-bold text-white">
              {mode === "login" ? "Bon retour 👋" : "Créer un compte 🚀"}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {mode === "login"
                ? "Connecte-toi pour analyser et sécuriser tes projets."
                : "Garde tes projets IA propres dès aujourd'hui."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                    Nom
                  </label>
                  <div className="relative">
                    <User
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                    />
                    <input
                      type="text"
                      className="input pl-10"
                      placeholder="Ogions D."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                  />
                  <input
                    type="email"
                    className="input pl-10"
                    placeholder="toi@shadowstack.app"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-1.5">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                  />
                  <input
                    type="password"
                    className="input pl-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 fade-in">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3"
              >
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    {mode === "login" ? "Se connecter" : "Créer mon compte"}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Séparateur + connexion GitHub */}
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--color-border)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-[var(--color-bg-card,transparent)] text-xs text-[var(--color-text-dim)]">
                    ou
                  </span>
                </div>
              </div>

              <a
                href="/api/auth/github"
                className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white/[0.06] border border-[var(--color-border)] text-white text-sm font-medium hover:bg-white/[0.1] transition"
              >
                <svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                Continuer avec GitHub
              </a>

              {mode === "login" && (
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs text-[var(--color-text-muted)] hover:text-cyan-300 font-medium transition"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              )}
            </form>

            <p className="mt-6 text-center text-xs text-[var(--color-text-dim)]">
              {mode === "login" ? (
                <>
                  Pas encore de compte ?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-cyan-300 hover:text-cyan-200 font-semibold"
                  >
                    S'inscrire gratuitement
                  </button>
                </>
              ) : (
                <>
                  Déjà un compte ?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="text-cyan-300 hover:text-cyan-200 font-semibold"
                  >
                    Se connecter
                  </button>
                </>
              )}
            </p>
          </div>

          <p className="text-center text-xs text-[var(--color-text-dim)] mt-6">
            En continuant, tu acceptes nos{" "}
            <span className="text-cyan-300 hover:underline cursor-pointer">
              CGU
            </span>{" "}
            et notre{" "}
            <span className="text-cyan-300 hover:underline cursor-pointer">
              politique de confidentialité
            </span>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
