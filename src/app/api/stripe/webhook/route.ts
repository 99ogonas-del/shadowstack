import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/stripe/webhook
 *
 * Reçoit les événements Stripe (paiement réussi, abonnement annulé...).
 * C'est ICI que le plan de l'utilisateur est réellement mis à jour —
 * jamais côté client (trop facile à falsifier).
 *
 * Signature vérifiée avec STRIPE_WEBHOOK_SECRET : garantit que
 * l'appel vient bien de Stripe et n'est pas forgé.
 */

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET manquante");
    return NextResponse.json(
      { error: "Webhook non configuré" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature absente" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (e) {
    console.error("[stripe] signature invalide", (e as Error).message);
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Paiement initial réussi (checkout) ou renouvellement
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        if (userId && plan) {
          await activatePlan(userId, plan, session.subscription as string, session.customer as string);
        }
        break;
      }

      // Abonnement mis à jour (changement de plan, renouvellement)
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const plan = sub.metadata?.plan;
        if (userId && plan && sub.status === "active") {
          await activatePlan(userId, plan, sub.id, sub.customer as string);
        }
        break;
      }

      // Abonnement supprimé (fin de période ou annulation) → retour Free
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (userId) {
          await db
            .update(users)
            .set({
              plan: "free",
              stripeSubscriptionId: null,
              stripePriceId: null,
              subscriptionStatus: "cancelled",
            })
            .where(eq(users.id, userId));
          await logAudit({
            userId,
            action: "subscription_cancelled",
            details: { subscriptionId: sub.id },
          });
        }
        break;
      }

      default:
        // événement non géré — on accuse réception quand même
        break;
    }
  } catch (e) {
    console.error("[stripe] traitement échoué", e);
    return NextResponse.json({ error: "Traitement échoué" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Active le plan payant d'un utilisateur après paiement confirmé. */
async function activatePlan(
  userId: string,
  plan: string,
  subscriptionId: string | null,
  customerId: string,
) {
  await db
    .update(users)
    .set({
      plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: "active",
    })
    .where(eq(users.id, userId));

  await logAudit({
    userId,
    action: "subscription_activated",
    details: { plan, subscriptionId },
  });
}
