import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 4000;

/** Course against a timeout : un check qui bloque ne doit pas bloquer /health. */
function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

type Check = { status: "up" | "down" | "skipped"; error?: string };

async function checkDb(): Promise<Check> {
  try {
    await withTimeout(db.execute(sql`select 1`));
    return { status: "up" };
  } catch (e) {
    return { status: "down", error: (e as Error).message };
  }
}

async function checkRedis(): Promise<Check> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { status: "skipped" };
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token });
    await withTimeout(redis.ping());
    return { status: "up" };
  } catch (e) {
    return { status: "down", error: (e as Error).message };
  }
}

/**
 * Health check RÉEL. Avant, il renvoyait toujours { ok: true } sans rien
 * tester — un site mort paraissait sain. Maintenant il sonde la DB (dépendance
 * critique) et Redis (optionnel — le rate-limit a un repli mémoire), et rend
 * 503 si la DB est inaccessible. Les statuts par composant sont explicites.
 */
export async function GET() {
  const [dbCheck, redisCheck] = await Promise.all([checkDb(), checkRedis()]);

  const checks = { db: dbCheck, redis: redisCheck };
  // Redis est optionnel (repli mémoire) : son échec n'affecte pas le "ok"
  // global, mais il est signalé dans les détails.
  const ok = dbCheck.status === "up";

  return Response.json(
    {
      ok,
      service: "shadowstack",
      checks,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
