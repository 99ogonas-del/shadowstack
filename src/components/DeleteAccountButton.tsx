"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, X } from "lucide-react";

/**
 * Bouton + modale de suppression de compte (RGPD).
 * Double barrière côté client : taper "SUPPRIMER" + mot de passe.
 * La vraie sécurité est côté serveur (route /api/account/delete).
 */
export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la suppression.");
        return;
      }
      // compte supprimé → retour à l'accueil
      router.push("/");
      router.refresh();
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 transition-colors text-sm font-medium"
      >
        <Trash2 size={16} />
        Supprimer mon compte
      </button>
    );
  }

  return (
    <div className="card border-red-500/40 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-red-300">
          <AlertTriangle size={18} />
          <h3 className="font-bold">Supprimer définitivement le compte</h3>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[var(--color-text-dim)] hover:text-white"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>

      <p className="text-sm text-[var(--color-text-muted)]">
        Cette action est <strong className="text-white">irréversible</strong>.
        Tous tes projets, scans, rapports et statistiques seront supprimés
        définitivement, conformément au RGPD (droit à l&apos;effacement).
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">
            Tape <strong className="text-red-300">SUPPRIMER</strong> pour
            confirmer
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="SUPPRIMER"
            className="input w-full"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="block text-xs text-[var(--color-text-muted)] mb-1">
            Ton mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="input w-full"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn-secondary flex-1 justify-center"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || confirmation !== "SUPPRIMER" || !password}
            className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} />
            {loading ? "Suppression..." : "Supprimer"}
          </button>
        </div>
      </div>
    </div>
  );
}
