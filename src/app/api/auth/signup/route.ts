import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  generateUserId,
  hashPassword,
} from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";
import { logAudit, getClientIp } from "@/lib/audit";

const AVATAR_COLORS = [
  "#00d4ff",
  "#8b5cf6",
  "#d946ef",
  "#10b981",
  "#f59e0b",
  "#ef4444",
];

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  try {
    const body = await req.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Tous les champs sont requis" },
        { status: 400 },
      );
    }
    const normalizedEmail = email.toLowerCase().trim();

    // validation du format email EN PREMIER
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 },
      );
    }

    // rate limiting anti-création de comptes en masse (par IP)
    const limit = await authRateLimit(`signup:${ip ?? "unknown"}`);
    if (!limit.allowed) {
      const minutes = Math.ceil((limit.retryAfterMs ?? 0) / 60000);
      await logAudit({
        userId: null,
        action: "rate_limited",
        details: { scope: "signup", email: normalizedEmail },
        ip,
      });
      return NextResponse.json(
        {
          error: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
        },
        { status: 429 },
      );
    }

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Un compte existe déjà avec cet email" },
        { status: 409 },
      );
    }

    const id = generateUserId();
    const passwordHash = await hashPassword(password);
    const avatarColor =
      AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    // token de vérification d'email (valide 24h)
    const emailVerifyToken = randomBytes(32).toString("hex");

    await db.insert(users).values({
      id,
      email: normalizedEmail,
      name: name.trim(),
      passwordHash,
      plan: "Free",
      avatarColor,
      emailVerified: false,
      emailVerifyToken,
    });

    // envoie l'email de vérification (échoue silencieusement en dev sans clé)
    await sendVerificationEmail(normalizedEmail, emailVerifyToken, name.trim());

    // connexion immédiate — l'utilisateur peut explorer, mais les actions
    // sensibles sont bloquées jusqu'à vérification (voir les routes concernées)
    await createSession(id);

    await logAudit({
      userId: id,
      action: "signup",
      details: { email: normalizedEmail },
      ip,
    });

    return NextResponse.json({
      ok: true,
      user: {
        id,
        email: normalizedEmail,
        name: name.trim(),
        emailVerified: false,
      },
    });
  } catch (e) {
    console.error("signup error", e);
    return NextResponse.json(
      { error: "Une erreur est survenue" },
      { status: 500 },
    );
  }
}
