import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Seed automatique désactivé avant déploiement : il créait un compte
  // "demo@vibeclean.app" avec mot de passe connu. Plus aucun compte
  // prédéfini ne doit exister en production.
  // (Le script src/lib/seed.ts reste disponible pour un usage manuel volontaire.)

  return (
    <div className="flex min-h-screen">
      <Sidebar
        user={{
          name: user.name,
          email: user.email,
          plan: user.plan,
          avatarColor: user.avatarColor,
          role: user.role,
        }}
      />
      <main className="flex-1 min-w-0">
        <MobileNav
          user={{
            name: user.name,
            email: user.email,
            avatarColor: user.avatarColor,
          }}
        />
        <div className="p-4 md:p-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
