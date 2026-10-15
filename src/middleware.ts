import { NextRequest, NextResponse } from "next/server";

/**
 * ShadowStack — Middleware d'authentification
 *
 * Garde centralisée : toute page sous /dashboard, /scan, /settings...
 * exige une session. Avant, chaque page faisait sa propre vérification —
 * ça marche, mais un oubli sur une future page = faille.
 *
 * Ce middleware est une 1re barrière rapide (pas de DB) :
 * il vérifie juste la PRÉSENCE du cookie. La vérification
 * réelle de la session en base reste faite dans chaque page
 * (getCurrentUser) — cookie invalide = page inutile à visiter.
 *
 * Sont publics : /login, /signup, /forgot-password, /reset-password,
 * /verify-email, /pricing, la racine (qui redirige selon session),
 * et toutes les routes /api/auth/* (login/signup/reset/verify).
 */

const SESSION_COOKIE = "vibeclean_session";

const publicPaths = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/pricing",
];

function isPublic(pathname: string): boolean {
  if (pathname === "/") return true;
  return publicPaths.some((p) => pathname.startsWith(p));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);

  // Les pages publiques sont toujours accessibles. ⚠️ On NE redirige
  // PAS /login → /dashboard sur la simple présence du cookie : un
  // cookie peut être périmé (session supprimée en base), et la page
  // /login elle-même décide déjà de rediriger si la session est
  // VRAIMENT valide. Sinon → boucle de redirection infinie.

  // Routes API : laissées passer (leur auth est faite dans chaque route).
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Toute page protégée (dashboard, scan, settings...) exige un cookie.
  if (!isPublic(pathname) && !hasSession) {
    const loginUrl = new URL("/login", req.url);
    // mémorise où l'utilisateur voulait aller (confort retour)
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Appliqué à tout sauf fichiers statiques (icônes, images, builds)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|icon.svg|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)",
  ],
};
