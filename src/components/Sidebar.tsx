"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderGit2,
  ScanLine,
  Sparkles,
  ShieldCheck,
  FlaskConical,
  BookOpen,
  Settings,
  LogOut,
  Rocket,
  CreditCard,
} from "lucide-react";
import { ShadowStackLogo } from "@/components/ShadowStackLogo";
import { cn } from "@/lib/utils";

export type SidebarUser = {
  name: string;
  email: string;
  plan: string;
  avatarColor: string;
};

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    pill?: string;
  }>;
}> = [
  {
    label: "App",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
      { label: "Projets", href: "/projects", icon: FolderGit2 },
      { label: "Analyses", href: "/scans", icon: ScanLine },
      { label: "Optimisation IA", href: "/ai", icon: Sparkles },
    ],
  },
  {
    label: "Outils",
    items: [
      {
        label: "Nouvelle analyse",
        href: "/scan/new",
        icon: Rocket,
        pill: "Nouveau",
      },
      { label: "Sécurité", href: "/security", icon: ShieldCheck },
      { label: "Coûts", href: "/costs", icon: CreditCard },
      { label: "Tests", href: "/tests", icon: FlaskConical },
      { label: "Documentation", href: "/docs", icon: BookOpen },
    ],
  },
  {
    label: "Compte",
    items: [
      { label: "Paramètres", href: "/settings", icon: Settings },
      { label: "Abonnement", href: "/pricing", icon: CreditCard },
    ],
  },
];

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-[var(--color-border)] bg-[#0c0c22] h-screen sticky top-0">
      <div className="p-5 border-b border-[var(--color-border)]">
        <Link href="/dashboard" className="flex items-center">
          <ShadowStackLogo size={36} />
          <div className="ml-3">
            <div className="text-lg font-bold leading-tight">
              <span className="text-white">Shadow</span>
              <span className="gradient-text-cyan">Stack</span>
            </div>
            <div className="text-[11px] text-[var(--color-text-dim)] tracking-wide">
              Analyse · Sécurise · Corrige
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-2 text-[11px] uppercase tracking-wider text-[var(--color-text-dim)] font-semibold">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn("nav-item", isActive && "active")}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.pill && (
                      <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 text-cyan-300">
                        {item.pill}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--color-border)]">
        <div className="rounded-xl p-3 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 mb-3">
          <div className="text-xs text-[var(--color-text-muted)]">
            Plan actuel
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-bold text-cyan-300">{user.plan}</span>
            <Link
              href="/pricing"
              className="text-xs text-cyan-300 hover:text-cyan-200 font-medium transition"
            >
              {user.plan === "Free" ? "Passer au Pro →" : "Gérer →"}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--color-bg-card)] transition cursor-pointer">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
            style={{
              background: `linear-gradient(135deg, ${user.avatarColor}, ${user.avatarColor}99)`,
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-[var(--color-text-dim)] truncate">
              {user.email}
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="p-1.5 rounded-md hover:bg-red-500/20 text-[var(--color-text-dim)] hover:text-red-400"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
