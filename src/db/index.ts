import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dns from "dns";

const databaseUrl = process.env.DATABASE_URL;

// ⚠️ Contournement IPv6 : le pooler Supabase (et certains DNS) résout
// en IPv6 uniquement sur des machines sans IPv6 global (dev local).
// Node essaie l'IPv6 d'abord → AggregateError. On force l'ordre IPv4
// AVANT la création du pool. Sans effet néfaste si l'IPv6 marche.
if (databaseUrl) {
  dns.setDefaultResultOrder("ipv4first");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

// Pool et db sont conditionnels - uniquement disponibles avec DATABASE_URL
export const pool: Pool | null = databaseUrl
  ? globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      // timeouts courts : mieux vaut une erreur claire qu'un render bloqué
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      max: 10, // le pooler Supabase Free a des limites — reste raisonnable
    })
  : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

// une erreur de connexion ne doit PAS crasher le process (sinon 500)
if (pool) {
  pool.on("error", (err) => {
    console.error("[db] erreur du pool PostgreSQL", err.message);
  });
}

export const db: ReturnType<typeof drizzle> | null = pool ? drizzle(pool) : null;