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
  // Match par segment complet (pas startsWith pur) : "/login" et "/login/x"
  // sont publics, mais "/loginx" ne l'est PAS — sinon une future route
  // sensible dont le nom commencerait par un path public serait faussement
  // autorisée.
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);

  // Générer un nonce pour le CSP (anti-XSS) — compatible Edge Runtime
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = btoa(String.fromCharCode(...nonceBytes));

  // Construire le CSP avec nonce (pas de unsafe-inline)
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  // Routes API : laissées passer (leur auth est faite dans chaque route).
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return res;
  }

  // Toute page protégée (dashboard, scan, settings...) exige un cookie.
  if (!isPublic(pathname) && !hasSession) {
    const loginUrl = new URL("/login", req.url);
    // mémorise où l'utilisateur voulait aller (confort retour)
    loginUrl.searchParams.set("redirect", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("Content-Security-Policy", csp);
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("Content-Security-Policy", csp);
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  return res;
}

export const config = {
  // Appliqué à tout sauf fichiers statiques (icônes, images, builds)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|favicon.svg|icon.svg|icon.png|apple-icon.png|robots.txt|sitemap.xml).*)",
  ],
};
