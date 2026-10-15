import { NextResponse } from "next/server";
import { runEngineTests } from "@/lib/engine/self-test";

/**
 * GET /api/tests/run
 * Exécute la suite de tests du moteur et retourne le rapport JSON.
 * Utilisé par la page /tests pour afficher les résultats réels.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const report = runEngineTests();
  return NextResponse.json(report);
}
