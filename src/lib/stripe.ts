/**
 * ShadowStack — Intégration Stripe
 *
 * Client Stripe + mapping des plans (Free/Pro/Team) vers les
 * Price IDs Stripe. Les IDs sont lus depuis l'environnement pour
 * pouvoir basculer test/prod sans toucher au code.
 */

import Stripe from "stripe";

// Lazy initialization - Stripe client is created on-demand
// This allows the build to succeed even without STRIPE_SECRET_KEY
const secretKey = process.env.STRIPE_SECRET_KEY;

export function getStripeClient(): Stripe | null {
  if (!secretKey) {
    return null;
  }
  return new Stripe(secretKey);
}

// Export a nullable stripe instance for backward compatibility
export const stripe: Stripe | null = getStripeClient();

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