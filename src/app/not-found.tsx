import Link from "next/link";
import { ScanSearch } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-6">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 mb-6">
          <ScanSearch size={28} className="text-cyan-400" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-3">404</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          Cette page n&apos;existe pas — ou le projet que tu cherches a été
          supprimé.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">
            Tableau de bord
          </Link>
          <Link href="/projects" className="btn-secondary">
            Mes projets
          </Link>
        </div>
      </div>
    </div>
  );
}
