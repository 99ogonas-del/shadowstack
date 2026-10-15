import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { verifyTotp } from "@/lib/totp";
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * 2FA — désactivation : demande un code TOTP valide
 * (preuve de possession avant de baisser la sécurité du compte).
 */

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA non activée" }, { status: 400 });
  }

  const body = await req.json();
  const code = String(body.code ?? "");

  if (!verifyTotp(code, user.totpSecret)) {
    await logAudit({
      userId: user.id,
      action: "2fa_failed",
      details: { scope: "disable" },
      ip,
    });
    return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
  }

  await db
    .update(users)
    .set({
      totpEnabled: false,
      totpSecret: null,
      recoveryCodes: null,
    })
    .where(eq(users.id, user.id));

  await logAudit({ userId: user.id, action: "2fa_disabled", ip });

  return NextResponse.json({ ok: true });
}
