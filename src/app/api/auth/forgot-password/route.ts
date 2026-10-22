import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { authRateLimit } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * Mot de passe oublié — étape 1 : génère un token et envoie l'email.
 *
 * En production (RESEND_API_KEY configurée) : l'email est envoyé, le
 * lien n'est JAMAIS retourné dans la réponse.
 * Sans clé email : repli en mode dev — le lien est retourné pour le test
 * local, et c'est indiqué explicitement.
 */

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").toLowerCase().trim();

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    // rate limiting (par IP) — anti-abus. getClientIp priorise x-real-ip
    // (fiable) sur x-forwarded-for (spoofable).
    const ip = getClientIp(req) ?? "unknown";
    const limit = await authRateLimit(`forgot:${ip}`);
    if (!limit.allowed) {
      const minutes = Math.ceil((limit.retryAfterMs ?? 0) / 60000);
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${minutes} min.` },
        { status: 429 },
      );
    }

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];

    // On répond TOUJOUR "ok" — ne jamais révéler si un email existe
    // (sinon énumération de comptes possible).
    if (!user) {
      return NextResponse.json({
        ok: true,
        message:
          "Si un compte existe, un lien de réinitialisation vient d'être envoyé.",
      });
    }

    // token aléatoire + stocké en hash (comme les sessions)
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    // invalide les anciens tokens de cet utilisateur
    await db
      .update(passwordResets)
      .set({ used: true })
      .where(and(eq(passwordResets.userId, user.id), eq(passwordResets.used, false)));

    await db.insert(passwordResets).values({
      id: randomBytes(16).toString("hex"),
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      used: false,
    });

    // ---- envoi de l'email ----
    const emailResult = await sendPasswordResetEmail(email, token, user.name);

    await logAudit({
      userId: user.id,
      action: "password_reset_requested",
      details: { emailSent: emailResult.sent },
      ip: getClientIp(req),
    });

    if (emailResult.sent) {
      // PRODUCTION : email parti, aucun lien dans la réponse
      return NextResponse.json({
        ok: true,
        message:
          "Si un compte existe, un lien de réinitialisation vient d'être envoyé.",
        emailSent: true,
      });
    }

    // Repli : pas d'email configuré ou envoi échoué.
    // En prod, on ne divulgue RIEN (le problème est logué côté serveur).
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[reset] email NON envoyé pour ${email} : ${emailResult.error}`,
      );
      return NextResponse.json({
        ok: true,
        message:
          "Si un compte existe, un lien de réinitialisation vient d'être envoyé.",
        emailSent: false,
      });
    }

    // Mode dev sans clé email : lien retourné explicitement
    return NextResponse.json({
      ok: true,
      message:
        "Si un compte existe, un lien de réinitialisation vient d'être envoyé.",
      emailSent: false,
      devResetUrl: `/reset-password?token=${token}`,
    });
  } catch (e) {
    console.error("forgot-password error", e);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 },
    );
  }
}
