/**
 * ShadowStack — Envoi d'emails transactionnels via Resend
 *
 * Configuration requise (dans .env.local) :
 *   RESEND_API_KEY=re_xxxxxxxxx        → clé API Resend (https://resend.com)
 *   EMAIL_FROM=noreply@tondomaine.com  → expéditeur (domaine vérifié)
 *   NEXT_PUBLIC_APP_URL=https://...    → URL publique de l'app (pour les liens)
 *
 * Comportement : si RESEND_API_KEY est absent, l'email n'est pas envoyé
 * et la fonction retourne { sent: false } — l'appelant décide quoi faire
 * (afficher le lien en mode dev, par exemple).
 */

import { Resend } from "resend";

export type EmailResult = { sent: boolean; error?: string };

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3001"
  );
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM ?? "ShadowStack <onboarding@resend.dev>";
}

// ---------- email de réinitialisation de mot de passe ----------

function resetPasswordHtml(resetUrl: string, name?: string): string {
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:26px;font-weight:800;color:#fff;">Shadow<span style="color:#22d3ee;">Stack</span></span>
      <div style="font-size:12px;color:#8b93a7;margin-top:4px;">Analyse · Sécurise · Corrige</div>
    </div>
    <div style="background:#12122b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <h1 style="color:#fff;font-size:20px;margin:0 0 16px 0;">Réinitialise ton mot de passe</h1>
      <p style="color:#aab0c0;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
        ${greeting}<br><br>
        Tu as demandé à réinitialiser ton mot de passe ShadowStack.
        Clique sur le bouton ci-dessous pour en définir un nouveau.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;">
          Choisir un nouveau mot de passe
        </a>
      </div>
      <p style="color:#8b93a7;font-size:12px;line-height:1.6;margin:0;">
        Ce lien expire dans <strong style="color:#aab0c0;">30 minutes</strong> et ne peut être utilisé qu&apos;une seule fois.<br><br>
        Si tu n&apos;es pas à l&apos;origine de cette demande, ignore cet email — ton mot de passe actuel reste valide.
      </p>
      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:24px;padding-top:16px;">
        <p style="color:#5c6377;font-size:11px;margin:0;word-break:break-all;">
          Si le bouton ne fonctionne pas, copie ce lien :<br>${resetUrl}
        </p>
      </div>
    </div>
    <p style="color:#5c6377;font-size:11px;text-align:center;margin-top:24px;">
      © ${new Date().getFullYear()} ShadowStack — Analyse, nettoie et sécurise tes projets IA.
    </p>
  </div>
</body>
</html>`;
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  name?: string,
): Promise<EmailResult> {
  const client = getClient();
  if (!client) {
    return { sent: false, error: "RESEND_API_KEY non configurée" };
  }

  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

  try {
    const { error } = await client.emails.send({
      from: getFromAddress(),
      to,
      subject: "Réinitialise ton mot de passe ShadowStack",
      html: resetPasswordHtml(resetUrl, name),
    });

    if (error) {
      console.error("[email] envoi échoué", error);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (e) {
    console.error("[email] exception", e);
    return {
      sent: false,
      error: e instanceof Error ? e.message : "Erreur inconnue",
    };
  }
}

// ---------- email de vérification de compte ----------

function verificationHtml(verifyUrl: string, name?: string): string {
  const greeting = name ? `Bonjour ${name},` : "Bonjour,";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:26px;font-weight:800;color:#fff;">Shadow<span style="color:#22d3ee;">Stack</span></span>
      <div style="font-size:12px;color:#8b93a7;margin-top:4px;">Analyse · Sécurise · Corrige</div>
    </div>
    <div style="background:#12122b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">
      <h1 style="color:#fff;font-size:20px;margin:0 0 16px 0;">Confirme ton adresse email</h1>
      <p style="color:#aab0c0;font-size:14px;line-height:1.6;margin:0 0 16px 0;">
        ${greeting}<br><br>
        Bienvenue sur ShadowStack ! Confirme ton adresse pour activer
        toutes les fonctionnalités de ton compte.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;">
          Vérifier mon email
        </a>
      </div>
      <p style="color:#8b93a7;font-size:12px;line-height:1.6;margin:0;">
        Ce lien expire dans <strong style="color:#aab0c0;">24 heures</strong>.<br><br>
        Si tu n'as pas créé de compte ShadowStack, ignore cet email.
      </p>
      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-top:24px;padding-top:16px;">
        <p style="color:#5c6377;font-size:11px;margin:0;word-break:break-all;">
          Si le bouton ne fonctionne pas, copie ce lien :<br>${verifyUrl}
        </p>
      </div>
    </div>
    <p style="color:#5c6377;font-size:11px;text-align:center;margin-top:24px;">
      © ${new Date().getFullYear()} ShadowStack — Analyse, nettoie et sécurise tes projets IA.
    </p>
  </div>
</body>
</html>`;
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  name?: string,
): Promise<EmailResult> {
  const client = getClient();
  if (!client) {
    console.log("[email] pas de clé — email de vérification non envoyé");
    return { sent: false, error: "RESEND_API_KEY non configurée" };
  }

  const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`;

  try {
    const { error } = await client.emails.send({
      from: getFromAddress(),
      to,
      subject: "Confirme ton adresse email ShadowStack",
      html: verificationHtml(verifyUrl, name),
    });

    if (error) {
      console.error("[email] vérification échouée", error);
      return { sent: false, error: error.message };
    }

    return { sent: true };
  } catch (e) {
    console.error("[email] exception", e);
    return {
      sent: false,
      error: e instanceof Error ? e.message : "Erreur inconnue",
    };
  }
}
