import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { requireUser, destroySession, verifyPassword } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { authRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/account/delete
 *
 * Suppression définitive du compte (droit à l'effacement — RGPD).
 * Exige le mot de passe pour confirmation : empêche qu'une session
 * volée (cookie) serve à détruire le compte sans le savoir.
 *
 * L'utilisateur est supprimé EN CASCADE (schéma Prisma) :
 * sessions, projets, scans, findings, audit logs — tout part avec lui.
 */

export async function POST(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const ip = getClientIp(req);
  const limit = await authRateLimit(`delete-account:${ip}`);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Trop de tentatives. Réessaie plus tard." },
      { status: 429 },
    );
  }

  let body: { password?: string; confirmation?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const { password, confirmation } = body;

  // 1. double exigence : mot de passe + mot "SUPPRIMER" tapé
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "Mot de passe requis pour confirmer." },
      { status: 400 },
    );
  }

  if (confirmation !== "SUPPRIMER") {
    return NextResponse.json(
      { error: "Tape SUPPRIMER en majuscules pour confirmer." },
      { status: 400 },
    );
  }

  // 2. vérification du mot de passe
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    await logAudit({
      userId: user.id,
      action: "account_delete_failed",
      details: { reason: "wrong_password" },
      ip,
    });
    return NextResponse.json(
      { error: "Mot de passe incorrect." },
      { status: 403 },
    );
  }

  // 3. suppression — la cascade supprime projets, scans, findings,
  //    sessions et logs d'audit liés à cet utilisateur.
  await db.delete(users).where(eq(users.id, user.id));

  // 4. journalise AVANT la cascade pour garder une trace de l'action
  //    (si la table audit_logs est en cascade, cette ligne partira aussi —
  //    c'est le comportement RGPD attendu : plus aucune donnée perso).
  await logAudit({
    userId: user.id,
    action: "account_deleted",
    details: { email: user.email },
    ip,
  });

  // 5. détruit la session en cours
  await destroySession();

  return NextResponse.json({
    ok: true,
    message: "Compte et données associées supprimés définitivement.",
  });
}
