"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Search, Plus } from "lucide-react";
import { VibeCleanLogo } from "@/components/VibeCleanLogo";
import { getInitials } from "@/lib/utils";

export function MobileNav({
  user,
}: {
  user: { name: string; email: string; avatarColor: string };
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden sticky top-0 z-30 bg-[#0c0c22]/95 backdrop-blur border-b border-[var(--color-border)] flex items-center justify-between px-4 py-3">
      <Link href="/dashboard" className="flex items-center">
        <VibeCleanLogo size={28} />
        <span className="ml-2 font-bold text-base">
          <span className="text-white">Vibe</span>
          <span className="gradient-text-cyan">Clean</span>
        </span>
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/scan/new"
          className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
        >
          <Plus size={18} />
        </Link>
        <button
          className="p-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-[#0c0c22] border-b border-[var(--color-border)] p-4 space-y-2">
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Tableau de bord
          </Link>
          <Link
            href="/projects"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Projets
          </Link>
          <Link
            href="/scans"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Analyses
          </Link>
          <Link
            href="/ai"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Optimisation IA
          </Link>
          <Link
            href="/scan/new"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Nouvelle analyse
          </Link>
          <Link
            href="/security"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Sécurité
          </Link>
          <Link
            href="/costs"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Coûts
          </Link>
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)]"
          >
            Paramètres
          </Link>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg-card)] mt-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{
                background: `linear-gradient(135deg, ${user.avatarColor}, ${user.avatarColor}99)`,
              }}
            >
              {getInitials(user.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-xs text-[var(--color-text-dim)] truncate">
                {user.email}
              </div>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button className="text-xs text-red-400 font-medium">
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
