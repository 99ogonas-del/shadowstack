import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShadowStack — Analyse, sécurise & corrige tes projets IA",
  description:
    "Le SaaS tout-en-un pour analyser, nettoyer et sécuriser les projets créés avec l'IA. Détecte les secrets exposés, dépendances obsolètes et optimise les coûts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className="bg-[#0a0a1a] text-[#e8e8f5] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
