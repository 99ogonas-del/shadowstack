/**
 * ShadowStack — Double authentification (TOTP)
 *
 * Enveloppe otplib v13 avec une API stable utilisable partout dans l'app.
 * TOTP = code à 6 chiffres qui change toutes les 30 secondes
 * (Google Authenticator, Authy, 1Password, etc.)
 */

import { generateSecret, generateURI, verifySync, generateSync } from "otplib";

/**
 * Crée un secret + l'URI otpauth:// pour le QR code.
 * À stocker côté serveur APRÈS vérification d'un premier code.
 */
export function createTotp(params: { email: string; issuer?: string }) {
  const secret = generateSecret();
  const otpauthUrl = generateURI({
    issuer: params.issuer ?? "ShadowStack",
    label: params.email,
    secret,
  });
  return { secret, otpauthUrl };
}

/** Vérifie un code TOTP à 6 chiffres contre un secret. */
export function verifyTotp(code: string, secret: string): boolean {
  try {
    const result = verifySync({ token: code, secret }) as unknown;
    // otplib v13 : { valid: boolean, delta?: number }
    return (
      typeof result === "object" &&
      result !== null &&
      (result as { valid?: boolean }).valid === true
    );
  } catch {
    return false;
  }
}

/** Génère le code courant (utile pour les tests automatisés). */
export function currentTotpCode(secret: string): string {
  return generateSync({ secret });
}
