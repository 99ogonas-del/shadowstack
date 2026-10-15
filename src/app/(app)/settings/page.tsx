import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { User, Lock, Bell, Palette } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <>
      <PageHeader title="Paramètres" subtitle="Gère ton compte et tes préférences." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{
                background: `linear-gradient(135deg, ${user.avatarColor}, ${user.avatarColor}99)`,
              }}
            >
              {user.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <div className="font-bold text-white">{user.name}</div>
              <div className="text-xs text-[var(--color-text-dim)]">
                {user.email}
              </div>
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] pt-4">
            <div className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
              Plan
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-300 font-bold text-lg">
                {user.plan}
              </span>
              <Link
                href="/pricing"
                className="text-xs text-cyan-300 hover:text-cyan-200 font-medium underline"
              >
                Voir les offres
              </Link>
            </div>
            <p className="text-xs text-[var(--color-text-dim)] mt-1">
              {user.plan === "Free"
                ? "3 scans inclus — illimité avec le plan Pro."
                : "Scans et projets illimités."}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Section icon={User} title="Profil">
            <Row label="Nom" value={user.name} />
            <Row label="Email" value={user.email} />
          </Section>
          <Section icon={Bell} title="Notifications">
            <Row label="Alertes critiques" value="Activé par email" />
            <Row label="Résumé hebdo" value="Tous les lundis" />
          </Section>
          <Section icon={Palette} title="Apparence">
            <Row label="Thème" value="Dark (par défaut)" />
          </Section>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn-secondary w-full justify-center">
              <Lock size={16} />
              Se déconnecter
            </button>
          </form>
          <DeleteAccountButton />
        </div>
      </div>
    </>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} className="text-cyan-300" />
        <h3 className="font-bold text-white">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[#0a0a1a] border border-[var(--color-border)]">
      <div className="text-sm text-[var(--color-text-muted)]">{label}</div>
      <div className="text-sm text-white font-medium">{value}</div>
    </div>
  );
}
