import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dns from "dns";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// ⚠️ Contournement IPv6 : le pooler Supabase (et certains DNS) résout
// en IPv6 uniquement sur des machines sans IPv6 global (dev local).
// Node essaie l'IPv6 d'abord → AggregateError. On force l'ordre IPv4
// AVANT la création du pool. Sans effet néfatif si l'IPv6 marche.
dns.setDefaultResultOrder("ipv4first");

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // timeouts courts : mieux vaut une erreur claire qu'un render bloqué
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    max: 10, // le pooler Supabase Free a des limites — reste raisonnable
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

// une erreur de connexion ne doit PAS crasher le process (sinon 500)
pool.on("error", (err) => {
  console.error("[db] erreur du pool PostgreSQL", err.message);
});

export const db = drizzle(pool);
