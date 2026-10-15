import { NextRequest, NextResponse } from "next/server";
import { eq, lt } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { authRateLimit } from "@/lib/rate-limit";
import { logAudit, getClientIp, type AuditAction } from "@/lib/audit";

/**
 * Connexion.
 *
 * - Rate limiting anti force-brute (par email + IP)
 * - Journal d'audit de chaque tentative (succès ET échec)
 * - Si le compte a la 2FA activée : on ne crée PAS la session, on
 *   renvoie { requires2FA: true } — le code TOTP est vérifié à l'étape 2
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const body = await req.json();
    const { email, password, totpCode } = body as {
      email?: string;
      password?: string;
      totpCode?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ---- rate limiting ----
    const limit = await authRateLimit(`${normalizedEmail}|${ip ?? "unknown"}`);
    if (!limit.allowed) {
      const minutes = Math.ceil((limit.retryAfterMs ?? 0) / 60000);
      await logAudit({
        userId: null,
        action: "rate_limited",
        details: { email: normalizedEmail, scope: "login" },
        ip,
      });
      return NextResponse.json(
        {
          error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        },
        { status: 429 },
      );
    }

    // purge opportuniste des sessions expirées
    await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    const user = rows[0];

    if (!user) {
      await logAudit({
        userId: null,
        action: "login_failed",
        details: { email: normalizedEmail, reason: "unknown_email" },
        ip,
      });
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      await logAudit({
        userId: user.id,
        action: "login_failed",
        details: { reason: "wrong_password" },
        ip,
      });
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 },
      );
    }

    // ---- 2FA : mot de passe bon, mais code requis ----
    if (user.totpEnabled && user.totpSecret) {
      if (!totpCode) {
        // étape 1 faite : on demande le code, on ne crée pas encore la session
        return NextResponse.json({ requires2FA: true });
      }

      const valid = verifyTotp(String(totpCode), user.totpSecret);
      if (!valid) {
        await logAudit({
          userId: user.id,
          action: "2fa_failed",
          details: { scope: "login" },
          ip,
        });
        return NextResponse.json(
          { error: "Code de vérification incorrect" },
          { status: 401 },
        );
      }
    }

    await createSession(user.id);

    await logAudit({
      userId: user.id,
      action: "login_success",
      details: { with2fa: Boolean(user.totpEnabled) },
      ip,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    });
  } catch (e) {
    console.error("login error", e);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 },
    );
  }
}
