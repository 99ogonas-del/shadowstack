/**
 * ShadowStack — Journal d'audit
 *
 * Trace les événements de sécurité : connexions, échecs, changements de
 * mot de passe, activation 2FA, suppressions... Chaque entrée garde
 * l'utilisateur, l'action, les détails et l'IP.
 *
 * Lecture : page /settings/security (journal consultable par l'utilisateur)
 */

import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { randomBytes } from "crypto";
import { desc, eq } from "drizzle-orm";

export type AuditAction =
  | "signup"
  | "login_success"
  | "login_failed"
  | "logout"
  | "password_changed"
  | "password_reset_requested"
  | "password_reset_done"
  | "email_verified"
  | "2fa_enabled"
  | "2fa_disabled"
  | "2fa_failed"
  | "project_created"
  | "project_deleted"
  | "scan_started"
  | "finding_fixed"
  | "finding_unfixed"
  | "rate_limited"
  | "account_delete_failed"
  | "account_deleted"
  | "checkout_started"
  | "subscription_activated"
  | "subscription_cancelled";

export async function logAudit(params: {
  userId: string | null;
  action: AuditAction;
  details?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: randomBytes(16).toString("hex"),
      userId: params.userId,
      action: params.action,
      details: params.details ?? null,
      ip: params.ip ?? null,
    });
  } catch (e) {
    // le log d'audit ne doit JAMAIS faire échouer l'action métier
    console.error("[audit] écriture échouée", e);
  }
}

export function getClientIp(req: Request): string | null {
  // x-real-ip D'ABORD : c'est le proxy (Vercel/nginx) qui le fixe → fiable,
  // non spoofable par le client. x-forwarded-for est en second car le client
  // peut le forger — s'il servait en 1re source, on contournerait le rate-limit
  // par IP et on polluerait les logs d'audit avec des IPs inventées.
  return (
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

/** Récupère les derniers événements d'un utilisateur (pour son journal). */
export async function getAuditLogsForUser(userId: string, limit = 50) {
  return db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/** Libellés lisibles pour l'affichage. */
export const AUDIT_LABELS: Record<AuditAction, { label: string; icon: string; tone: "ok" | "warn" | "danger" }> = {
  signup: { label: "Compte créé", icon: "✨", tone: "ok" },
  login_success: { label: "Connexion réussie", icon: "🔓", tone: "ok" },
  login_failed: { label: "Tentative de connexion échouée", icon: "⚠️", tone: "warn" },
  logout: { label: "Déconnexion", icon: "👋", tone: "ok" },
  password_changed: { label: "Mot de passe modifié", icon: "🔑", tone: "warn" },
  password_reset_requested: { label: "Réinitialisation demandée", icon: "📧", tone: "warn" },
  password_reset_done: { label: "Mot de passe réinitialisé", icon: "🔑", tone: "warn" },
  email_verified: { label: "Email vérifié", icon: "✅", tone: "ok" },
  "2fa_enabled": { label: "Double authentification activée", icon: "🛡️", tone: "ok" },
  "2fa_disabled": { label: "Double authentification désactivée", icon: "🛡️", tone: "warn" },
  "2fa_failed": { label: "Code 2FA incorrect", icon: "⚠️", tone: "danger" },
  rate_limited: { label: "Trop de tentatives (limité)", icon: "🚦", tone: "warn" },
  account_delete_failed: { label: "Suppression de compte échouée", icon: "⚠️", tone: "danger" },
  account_deleted: { label: "Compte supprimé", icon: "🗑️", tone: "danger" },
  checkout_started: { label: "Paiement lancé", icon: "💳", tone: "ok" },
  subscription_activated: { label: "Abonnement activé", icon: "✅", tone: "ok" },
  subscription_cancelled: { label: "Abonnement annulé", icon: "🚫", tone: "warn" },
  project_created: { label: "Projet analysé", icon: "📦", tone: "ok" },
  project_deleted: { label: "Projet supprimé", icon: "🗑️", tone: "warn" },
  scan_started: { label: "Analyse lancée", icon: "🔍", tone: "ok" },
  finding_fixed: { label: "Constat marqué corrigé", icon: "✔️", tone: "ok" },
  finding_unfixed: { label: "Correction annulée", icon: "↩️", tone: "warn" },
};
