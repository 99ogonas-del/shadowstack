import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { AdminDashboard } from "@/components/AdminDashboard";
import { ShieldAlert } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * /admin — Back-office plateforme (réservé aux admins).
 * Le vrai contrôle est fait côté API ; ici on affiche 403 sinon on redirige.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") {
    return (
      <>
        <PageHeader title="Accès refusé" />
        <div className="card text-center py-16">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 mb-4">
            <ShieldAlert size={26} className="text-red-400" />
          </div>
          <h3 className="font-bold text-white text-lg">
            Zone réservée aux administrateurs
          </h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Cette page n&apos;est pas accessible avec ton compte.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Administration"
        subtitle="Vue d'ensemble de la plateforme ShadowStack."
      />
      <AdminDashboard />
    </>
  );
}
