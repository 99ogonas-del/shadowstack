import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResets, sessions } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * Mot de passe oublié — étape 2 : applique le nouveau mot de passe.
 * Le token est à usage unique et expire après 30 minutes.
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "");
    const password = String(body.password ?? "");

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token et mot de passe requis" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 },
      );
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    // token valide = existe, non utilisé, non expiré
    const rows = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          eq(passwordResets.used, false),
          gt(passwordResets.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const reset = rows[0];
    if (!reset) {
      return NextResponse.json(
        { error: "Lien invalide ou expiré. Refais une demande." },
        { status: 400 },
      );
    }

    // change le mot de passe
    const newHash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, reset.userId));

    // marque le token utilisé (usage unique)
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(eq(passwordResets.id, reset.id));

    // sécurité : déconnecte toutes les sessions existantes de cet utilisateur
    // (si quelqu'un avait volé la session, il est déconnecté)
    await db.delete(sessions).where(eq(sessions.userId, reset.userId));

    await logAudit({
      userId: reset.userId,
      action: "password_reset_done",
      ip: getClientIp(req),
    });

    return NextResponse.json({
      ok: true,
      message: "Mot de passe mis à jour. Tu peux te connecter.",
    });
  } catch (e) {
    console.error("reset-password error", e);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 },
    );
  }
}
