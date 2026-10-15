import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * 2FA — activation : l'utilisateur confirme un code TOTP valide
 * (preuve qu'il a bien scanné le secret). On génère aussi 8 codes
 * de récupération à usage unique, en cas de téléphone perdu.
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (user.totpEnabled) {
    return NextResponse.json({ error: "Déjà activée" }, { status: 400 });
  }
  if (!user.totpSecret) {
    return NextResponse.json(
      { error: "Lance d'abord la configuration (setup)." },
      { status: 400 },
    );
  }

  const body = await req.json();
  const code = String(body.code ?? "");

  if (!verifyTotp(code, user.totpSecret)) {
    await logAudit({
      userId: user.id,
      action: "2fa_failed",
      details: { scope: "enable" },
      ip,
    });
    return NextResponse.json(
      { error: "Code incorrect. Vérifie l'heure de ton téléphone et réessaie." },
      { status: 400 },
    );
  }

  // 8 codes de récupération
  const recoveryCodes = Array.from({ length: 8 }, () =>
    randomBytes(4).toString("hex").toUpperCase(),
  );

  await db
    .update(users)
    .set({ totpEnabled: true, recoveryCodes })
    .where(eq(users.id, user.id));

  await logAudit({ userId: user.id, action: "2fa_enabled", ip });

  return NextResponse.json({
    ok: true,
    // affichés UNE SEULE FOIS — l'utilisateur doit les sauvegarder
    recoveryCodes,
  });
}
