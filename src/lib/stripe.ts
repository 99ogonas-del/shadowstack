/**
 * ShadowStack — Intégration Stripe
 *
 * Client Stripe + mapping des plans (Free/Pro/Team) vers les
 * Price IDs Stripe. Les IDs sont lus depuis l'environnement pour
 * pouvoir basculer test/prod sans toucher au code.
 */

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY manquante — nécessaire pour le paiement.",
  );
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/** Les plans payants, mappés sur les Price IDs Stripe. */
export const STRIPE_PLANS = {
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO ?? "price_1UQmhpAJ4vb83Zahds2MaQ7N",
    name: "ShadowStack Pro",
    planName: "pro" as const,
    amount: 9,
  },
  team: {
    priceId: process.env.STRIPE_PRICE_TEAM ?? "price_1UQmiXAJ4vb83ZahxKt9Yxrz",
    name: "ShadowStack Team",
    planName: "team" as const,
    amount: 29,
  },
} as const;

export type StripePlanId = keyof typeof STRIPE_PLANS;

export function isPaidPlan(id: string): id is StripePlanId {
  return id === "pro" || id === "team";
}

/** URL de base de l'app (pour les redirections Stripe). */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://shadowstack.vercel.app"
      : "http://localhost:3001")
  );
}
