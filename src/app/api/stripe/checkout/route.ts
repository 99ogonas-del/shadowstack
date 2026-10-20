import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import {
  stripe,
  STRIPE_PLANS,
  isPaidPlan,
  getAppUrl,
  type StripePlanId,
} from "@/lib/stripe";
import { scanRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/stripe/checkout
 * Crée une session Stripe Checkout pour le plan demandé.
 * Redirige l'utilisateur vers la page de paiement hébergée par Stripe.
 */

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // Check Stripe is configured
  if (!stripe) {
    console.error("[stripe] STRIPE_SECRET_KEY manquante");
    return NextResponse.json(
      { error: "Stripe non configuré" },
      { status: 503 },
    );
  }

  // Check DB is configured
  if (!db) {
    console.error("[db] DATABASE_URL manquante");
    return NextResponse.json(
      { error: "Base de données non configurée" },
      { status: 503 },
    );
  }

  const ip = getClientIp(req);
  const limit = await scanRateLimit(`checkout:${user.id}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie plus tard." },
      { status: 429 },
    );
  }

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const planId = body.plan;
  if (!planId || !isPaidPlan(planId)) {
    return NextResponse.json({ error: "Plan inconnu" }, { status: 400 });
  }

  const plan = STRIPE_PLANS[planId as StripePlanId];

  // déjà abonné à ce plan ?
  if (user.plan === plan.planName) {
    return NextResponse.json(
      { error: `Tu es déjà sur le plan ${plan.name}.` },
      { status: 400 },
    );
  }

  // réutilise le customer Stripe s'il existe (sinon Stripe en crée un)
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await db
      .update(users)
      .set({ stripeCustomerId: customerId })
      .where(eq(users.id, user.id));
  }

  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?checkout=success&plan=${planId}`,
    cancel_url: `${appUrl}/pricing?checkout=cancelled`,
    metadata: {
      userId: user.id,
      plan: planId,
    },
    subscription_data: {
      metadata: { userId: user.id, plan: planId },
    },
  });

  await logAudit({
    userId: user.id,
    action: "checkout_started",
    details: { plan: planId, sessionId: session.id },
    ip,
  });

  return NextResponse.json({ url: session.url });
}