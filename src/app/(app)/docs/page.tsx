import Link from "next/link";
import { BookOpen, Sparkles, ChevronRight, Wand2, Shield, Zap } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const docs = [
  {
    icon: Wand2,
    title: "Démarrage rapide",
    desc: "Connecte ton premier dépôt en moins de 60 secondes.",
    badge: "5 min",
  },
  {
    icon: Shield,
    title: "Comprendre les scores",
    desc: "Comment ShadowStack calcule le score de santé de tes projets.",
    badge: "Concept",
  },
  {
    icon: Zap,
    title: "Optimiser tes coûts IA",
    desc: "Patterns qui font exploser tes factures OpenAI et comment les éviter.",
    badge: "Avancé",
  },
  {
    icon: Sparkles,
    title: "API publique",
    desc: "Intègre ShadowStack dans ton CI/CD avec notre API REST.",
    badge: "API",
  },
  {
    icon: BookOpen,
    title: "Bonnes pratiques post-scan",
    desc: "Workflow recommandé après chaque analyse.",
    badge: "Guide",
  },
];

export default function DocsPage() {
  return (
    <>
      <PageHeader
        title="Documentation"
        subtitle="Tout ce qu'il faut pour tirer le meilleur de ShadowStack."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docs.map((d) => (
          <Link
            key={d.title}
            href="#"
            className="card card-hover flex items-start gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <d.icon size={22} className="text-cyan-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white">{d.title}</span>
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-dim)] px-2 py-0.5 rounded bg-[#0a0a1a] border border-[var(--color-border)]">
                  {d.badge}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">{d.desc}</p>
            </div>
            <ChevronRight size={18} className="text-[var(--color-text-dim)] mt-1 shrink-0" />
          </Link>
        ))}
      </div>
    </>
  );
}
