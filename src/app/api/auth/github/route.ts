import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

/**
 * GET /api/auth/github
 *
 * Lance le flux OAuth GitHub : redirige l'utilisateur vers la page
 * d'autorisation GitHub. Le paramètre "state" (aléatoire) protège
 * du CSRF — on le vérifie au retour dans /callback.
 */

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/login?error=github_not_configured", req.url),
    );
  }

  // state anti-CSRF
  const state = randomBytes(16).toString("hex");

  // mémorise l'URL de base pour le callback
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NODE_ENV === "production"
      ? "https://shadowstack.vercel.app"
      : "http://localhost:3001");

  const redirectUri = `${appUrl}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user user:email", // lecture du profil + email
    state,
  });

  const res = NextResponse.redirect(
    `${GITHUB_AUTHORIZE_URL}?${params.toString()}`,
  );

  // stocke le state dans un cookie court pour le vérifier au retour
  res.cookies.set("github_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600, // 10 min
    path: "/",
  });

  return res;
}
