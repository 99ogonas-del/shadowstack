import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { logAudit, getClientIp } from "@/lib/audit";

/** Vérification d'email — valide le token reçu par email (valide 24h). */
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.emailVerifyToken, token))
    .limit(1);

  const user = rows[0];
  if (!user) {
    return NextResponse.json(
      { error: "Lien de vérification invalide ou déjà utilisé." },
      { status: 400 },
    );
  }

  await db
    .update(users)
    .set({ emailVerified: true, emailVerifyToken: null })
    .where(eq(users.id, user.id));

  await logAudit({ userId: user.id, action: "email_verified", ip });

  return NextResponse.json({ ok: true, email: user.email });
}

/** Renvoie un email de vérification à l'utilisateur connecté. */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { requireUser } = await import("@/lib/auth");
  const { randomBytes } = await import("crypto");
  const { sendVerificationEmail } = await import("@/lib/email");

  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const token = randomBytes(32).toString("hex");
  await db
    .update(users)
    .set({ emailVerifyToken: token })
    .where(eq(users.id, user.id));

  const result = await sendVerificationEmail(user.email, token, user.name);

  return NextResponse.json({
    ok: true,
    emailSent: result.sent,
    ...(process.env.NODE_ENV !== "production" && !result.sent
      ? { devVerifyUrl: `/verify-email?token=${token}` }
      : {}),
  });
}
