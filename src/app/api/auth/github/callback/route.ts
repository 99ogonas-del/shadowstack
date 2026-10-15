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
import { logAudit, getClientIp } from "@/lib/audit";

/**
 * GET /api/auth/github/callback
 *
 * GitHub redirige ici après autorisation. On :
 * 1. vérifie le state (anti-CSRF)
 * 2. échange le code contre un access token
 * 3. récupère le profil GitHub (id, login, email)
 * 4. connecte l'utilisateur : lie le compte existant (même email)
 *    ou en crée un nouveau
 */

const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_API = "https://api.github.com";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const ip = getClientIp(req);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://shadowstack.vercel.app"
      : "http://localhost:3001");

  // 1. erreurs renvoyées par GitHub (ex: accès refusé)
  const oauthError = searchParams.get("error");
  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/login?error=github_denied`, appUrl),
    );
  }

  // 2. vérification du state
  const savedState = req.cookies.get("github_oauth_state")?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(
      new URL(`/login?error=github_state`, appUrl),
    );
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(`/login?error=github_not_configured`, appUrl),
    );
  }

  // 3. échange code → access token
  const tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${appUrl}/api/auth/github/callback`,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL(`/login?error=github_token`, appUrl),
    );
  }

  const tokenData = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return NextResponse.redirect(
      new URL(`/login?error=github_token`, appUrl),
    );
  }

  // 4. profil GitHub
  const ghHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ShadowStack-Scanner",
  };

  const userRes = await fetch(`${GITHUB_API}/user`, { headers: ghHeaders });
  if (!userRes.ok) {
    return NextResponse.redirect(
      new URL(`/login?error=github_profile`, appUrl),
    );
  }
  const ghUser = (await userRes.json()) as {
    id: number;
    login: string;
    name?: string | null;
    email?: string | null;
  };

  // email : GitHub ne le renvoie pas toujours dans /user → /user/emails
  let email = ghUser.email;
  if (!email) {
    const emailsRes = await fetch(`${GITHUB_API}/user/emails`, {
      headers: ghHeaders,
    });
    if (emailsRes.ok) {
      const emails = (await emailsRes.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      email =
        emails.find((e) => e.primary && e.verified)?.email ??
        emails.find((e) => e.verified)?.email ??
        null;
    }
  }

  // 5. retrouve ou crée le compte
  let user = await db
    .select()
    .from(users)
    .where(eq(users.githubId, String(ghUser.id)))
    .limit(1)
    .then((r) => r[0]);

  let isNew = false;

  if (!user && email) {
    // compte existant avec le même email → on lie les deux identités
    const byEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
      .then((r) => r[0]);

    if (byEmail) {
      await db
        .update(users)
        .set({
          githubId: String(ghUser.id),
          githubUsername: ghUser.login,
          githubAccessToken: accessToken,
          emailVerified: true, // GitHub a déjà vérifié l'email
        })
        .where(eq(users.id, byEmail.id));
      user = { ...byEmail, githubId: String(ghUser.id) };
    }
  }

  if (!user) {
    // nouveau compte via GitHub — pas de mot de passe : on en génère
    // un aléatoire inutilisable (l'auth se fait par GitHub)
    const randomPwd = randomBytes(32).toString("hex");
    const userId = generateUserId();
    await db.insert(users).values({
      id: userId,
      email: email ?? `${ghUser.login}@users.noreply.github.com`,
      name: ghUser.name ?? ghUser.login,
      passwordHash: await hashPassword(randomPwd),
      plan: "free",
      githubId: String(ghUser.id),
      githubUsername: ghUser.login,
      githubAccessToken: accessToken,
      emailVerified: true,
    });
    user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((r) => r[0]);
    isNew = true;
  }

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?error=github_failed`, appUrl),
    );
  }

  // 6. journalise + ouvre la session
  await logAudit({
    userId: user.id,
    action: isNew ? "signup" : "login_success",
    details: { via: "github", githubLogin: ghUser.login },
    ip,
  });

  await createSession(user.id);

  const res = NextResponse.redirect(new URL("/dashboard", appUrl));
  // nettoie le cookie de state
  res.cookies.set("github_oauth_state", "", { maxAge: 0, path: "/" });
  return res;
}
