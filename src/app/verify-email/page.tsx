import { VerifyForm } from "./verify-form";

/**
 * Page de vérification email (composant SERVEUR).
 * Lit le token depuis searchParams côté serveur → le rendu est présent en SSR
 * (contrairement à la version précédente qui lisait le token via useSearchParams
 *  derrière un <Suspense fallback={null}> et restait vide côté client).
 * Le token est transmis à l'enfant client qui gère l'interaction.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token ?? "";

  return <VerifyForm token={token} />;
}
