import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { SubscribeButton } from "@/components/SubscribeButton";
import { Check, Sparkles, Zap, Rocket, X } from "lucide-react";
import { ShadowStackLogo } from "@/components/ShadowStackLogo";

export const dynamic = "force-dynamic";

const PLANS = [
  {
    id: "free",
    name: "Gratuit",
    price: 0,
    period: "pour toujours",
    tagline: "Pour tester et les petits projets perso.",
    icon: Sparkles,
    highlight: false,
    features: [
      { text: "3 scans au total", included: true },
      { text: "1 projet analysé", included: true },
      { text: "Détection des failles de sécurité", included: true },
      { text: "Rapport détaillé par faille", included: true },
      { text: "Analyse des dépendances (npm, Python)", included: true },
      { text: "Scans illimités", included: false },
      { text: "Historique et évolution", included: false },
      { text: "Analyse de dépôts GitHub", included: false },
    ],
    cta: "Commencer gratuitement",
    ctaHref: "/login?mode=signup",
  },
  {
    id: "pro",
    name: "Pro",
    price: 9,
    period: "/ mois",
    tagline: "Pour les vibe coders sérieux et les freelances.",
    icon: Zap,
    highlight: true,
    badge: "Le plus populaire",
    features: [
      { text: "Scans illimités", included: true },
      { text: "Projets illimités", included: true },
      { text: "Analyse de dépôts GitHub publics", included: true },
      { text: "Historique complet des analyses", included: true },
      { text: "Suivi de l'évolution des scores", included: true },
      { text: "Détection des failles de sécurité", included: true },
      { text: "Analyse des dépendances (npm, Python)", included: true },
      { text: "Support par email", included: true },
    ],
    cta: "Passer au Pro",
    ctaHref: "/login?mode=signup",
  },
  {
    id: "studio",
    name: "Studio",
    price: 29,
    period: "/ mois",
    tagline: "Pour les agences et les équipes qui shippent.",
    icon: Rocket,
    highlight: false,
    features: [
      { text: "Tout le plan Pro", included: true },
      { text: "Multi-utilisateurs (5 sièges)", included: true },
      { text: "API REST + intégration CI/CD", included: true },
      { text: "Rapports exportables (PDF, CSV)", included: true },
      { text: "Scan planifié automatique", included: true },
      { text: "Support prioritaire", included: true },
      { text: "Usage commercial autorisé", included: true },
      { text: "Onboarding assisté", included: true },
    ],
    cta: "Parler à l'équipe",
    ctaHref: "/login?mode=signup",
  },
];

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* header */}
      <header className="border-b border-[var(--color-border)] sticky top-0 bg-[var(--color-bg)]/90 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center">
            <ShadowStackLogo size={34} />
            <div className="ml-2.5">
              <div className="text-lg font-bold leading-tight">
                <span className="text-white">Shadow</span>
                <span className="gradient-text-cyan">Stack</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary !py-2 !px-4 text-sm">
                Mon tableau de bord
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-[var(--color-text-muted)] hover:text-white transition"
                >
                  Se connecter
                </Link>
                <Link href="/login?mode=signup" className="btn-primary !py-2 !px-4 text-sm">
                  Essai gratuit
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-semibold mb-6">
            <Sparkles size={12} /> Tarifs simples, sans engagement
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Analyse ton code IA,
            <br />
            <span className="gradient-text-cyan">sans te ruiner.</span>
          </h1>
          <p className="text-[var(--color-text-muted)] max-w-xl mx-auto">
            Commence gratuitement. Passe au Pro quand tu shippes pour de vrai.
            Annule quand tu veux — un seul email suffit.
          </p>
        </div>

        {/* grille des plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = user?.plan?.toLowerCase() === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative card p-6 flex flex-col ${
                  plan.highlight
                    ? "border-cyan-400/50 bg-gradient-to-b from-cyan-500/[0.08] to-transparent md:-translate-y-2 md:shadow-2xl md:shadow-cyan-500/10"
                    : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      plan.highlight
                        ? "bg-cyan-500/15 border border-cyan-400/30"
                        : "bg-white/[0.04] border border-[var(--color-border)]"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={plan.highlight ? "text-cyan-400" : "text-[var(--color-text-muted)]"}
                    />
                  </div>
                  <div>
                    <div className="font-bold text-white text-lg">{plan.name}</div>
                    {isCurrent && (
                      <div className="text-xs text-cyan-300 font-semibold">
                        ← ton plan actuel
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.price === 0 ? "0 €" : `${plan.price} €`}
                    </span>
                    <span className="text-sm text-[var(--color-text-dim)]">
                      {plan.period}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] mt-2">
                    {plan.tagline}
                  </p>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5 text-sm">
                      {f.included ? (
                        <Check
                          size={15}
                          className={`shrink-0 mt-0.5 ${
                            plan.highlight ? "text-cyan-400" : "text-emerald-400"
                          }`}
                        />
                      ) : (
                        <X size={15} className="shrink-0 mt-0.5 text-[var(--color-text-dim)]" />
                      )}
                      <span
                        className={
                          f.included
                            ? "text-[var(--color-text-muted)]"
                            : "text-[var(--color-text-dim)] line-through"
                        }
                      >
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full text-center py-3 rounded-xl bg-white/[0.04] border border-[var(--color-border)] text-sm text-[var(--color-text-muted)]">
                    Plan actif
                  </div>
                ) : plan.id === "pro" ? (
                  <SubscribeButton
                    planId="pro"
                    className="btn-primary"
                  >
                    {plan.cta}
                  </SubscribeButton>
                ) : plan.id === "studio" ? (
                  <SubscribeButton
                    planId="team"
                    className="btn-secondary"
                  >
                    {plan.cta}
                  </SubscribeButton>
                ) : (
                  <Link
                    href={user ? `/settings?plan=${plan.id}` : plan.ctaHref}
                    className={`w-full justify-center ${
                      plan.highlight ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ honnête */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Questions fréquentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Comment vous calculez les limites du plan gratuit ?",
                a: "3 scans au total, tout simplement. Après, tu passes au Pro — c'est appliqué côté serveur, pas juste affiché.",
              },
              {
                q: "Est-ce que ShadowStack modifie mon code ?",
                a: "Non. On analyse et on propose des corrections détaillées — c'est toi qui les appliques dans ton éditeur. On ne touche jamais à tes fichiers.",
              },
              {
                q: "Mes dépôts privés ?",
                a: "Pour l'instant, importe un ZIP de ton projet. Le support des dépôts privés arrive avec la connexion OAuth GitHub.",
              },
              {
                q: "Je peux annuler quand ?",
                a: "Quand tu veux, en un email. Pas de piège, pas de reconduction cachée.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="card p-4 group cursor-pointer [&_summary]:list-none"
              >
                <summary className="flex items-center justify-between font-semibold text-white text-sm">
                  {item.q}
                  <span className="text-cyan-400 group-open:rotate-45 transition-transform text-lg">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA final */}
        <div className="text-center mt-16">
          <p className="text-[var(--color-text-muted)] mb-4">
            Ton app IA mérite mieux qu&apos;un clé API en clair sur GitHub.
          </p>
          <Link href="/login?mode=signup" className="btn-primary !py-3 !px-8">
            Scanner mon premier projet
          </Link>
        </div>
      </main>

      {/* footer */}
      <footer className="border-t border-[var(--color-border)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[var(--color-text-dim)]">
            © {new Date().getFullYear()} ShadowStack — Analyse, nettoie et
            sécurise tes projets IA.
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--color-text-dim)]">
            <Link href="/docs" className="hover:text-white transition">
              Documentation
            </Link>
            <Link href="/pricing" className="hover:text-white transition">
              Tarifs
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
