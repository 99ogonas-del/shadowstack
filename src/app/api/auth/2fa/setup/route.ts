import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { createTotp } from "@/lib/totp";

/**
 * 2FA — configuration : génère le secret TOTP et l'URI pour le QR code.
 * Le secret n'est PAS encore actif — il le devient via /enable
 * une fois que l'utilisateur a scanné le QR et vérifié un code.
 */

export async function POST(_req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (user.totpEnabled) {
    return NextResponse.json(
      { error: "La double authentification est déjà activée." },
      { status: 400 },
    );
  }

  const { secret, otpauthUrl } = createTotp({ email: user.email });

  // stocké en attente (totp_enabled reste false)
  await db
    .update(users)
    .set({ totpSecret: secret })
    .where(eq(users.id, user.id));

  return NextResponse.json({ ok: true, secret, otpauthUrl });
}
