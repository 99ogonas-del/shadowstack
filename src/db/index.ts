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

// Lazy : on ne crée le pool qu'à la première utilisation, pour que le
// build Next.js (collecte des données de page) ne plante pas quand
// DATABASE_URL est absent (ex: preview Vercel sans env var).
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function getPool(): Pool {
  if (_pool) return _pool;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  _pool =
    globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
      // timeouts courts : mieux vaut une erreur claire qu'un render bloqué
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
      max: 10, // le pooler Supabase Free a des limites — reste raisonnable
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__arenaNextJsPostgresqlPool = _pool;
  }

  // une erreur de connexion ne doit PAS crasher le process (sinon 500)
  _pool.on("error", (err) => {
    console.error("[db] erreur du pool PostgreSQL", err.message);
  });

  return _pool;
}

function getDb() {
  if (_db) return _db;
  _db = drizzle(getPool());
  return _db;
}

// Proxy lazy : le module s'importe sans erreur même sans DATABASE_URL.
// L'erreur est levée seulement à l'utilisation réelle (runtime).
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
