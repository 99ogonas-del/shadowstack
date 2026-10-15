"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Bouton d'abonnement Stripe.
 * Appelle /api/stripe/checkout → reçoit l'URL de paiement Stripe →
 * redirige l'utilisateur vers la page de paiement hébergée.
 */
export function SubscribeButton({
  planId,
  className,
  children,
}: {
  planId: "pro" | "team";
  className?: string;
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur lors de la création du paiement.");
        return;
      }
      if (data.url) {
        window.location.href = data.url; // redirection vers Stripe
      }
    } catch {
      setError("Erreur réseau. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleSubscribe}
        disabled={loading}
        className={`w-full justify-center ${className ?? ""}`}
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : null}
        {children}
      </button>
      {error && (
        <p className="text-xs text-red-400 mt-2 text-center">{error}</p>
      )}
    </>
  );
}
