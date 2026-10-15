/**
 * Rate limiter — hybride Upstash REST / mémoire
 *
 * Si UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN sont configurés
 * → compteurs partagés entre toutes les instances (HTTPS, passe partout :
 * dev local comme Vercel). Sinon → repli en mémoire (suffisant pour
 * une instance unique en dev).
 *
 * Pourquoi le SDK REST et pas ioredis (TCP 6379) :
 * l'endpoint TCP d'Upstash ne résout qu'en IPv6 sur certaines machines
 * (dev local) et consomme une connexion par instance serverless.
 * Le REST passe en HTTPS (443) et scale sans connexion persistante.
 */

import { Redis as UpstashRedis } from "@upstash/redis";

type Bucket = {
  count: number;
  firstAttempt: number;
  blockedUntil: number;
};

const buckets = new Map<string, Bucket>();

// nettoyage périodique pour éviter la fuite mémoire
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, b] of buckets) {
    if (now > b.blockedUntil && now - b.firstAttempt > 60 * 60 * 1000) {
      buckets.delete(key);
    }
  }
}

// ---------- backend Upstash (optionnel) ----------

let redisClient: UpstashRedis | null = null;
let redisChecked = false;

function getRedis(): UpstashRedis | null {
  if (redisChecked) return redisClient;
  redisChecked = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    redisClient = new UpstashRedis({ url, token });
    if (process.env.NODE_ENV !== "production") {
      console.log("[rate-limit] Upstash Redis (REST) actif");
    }
  } catch {
    redisClient = null;
  }
  return redisClient;
}

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs?: number;
  backend: "redis" | "memory";
};

/**
 * @param key identifiant (email, IP, userId...)
 * @param maxAttempts tentatives autorisées dans la fenêtre
 * @param windowMs taille de la fenêtre
 * @param blockMs durée de blocage après dépassement
 */
export async function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
  blockMs: number,
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (redis) {
    try {
      return await rateLimitRedis(redis, key, maxAttempts, windowMs, blockMs);
    } catch {
      // erreur réseau Upstash → on continue en mémoire
    }
  }
  return rateLimitMemory(key, maxAttempts, windowMs, blockMs);
}

// ---------- implémentation Upstash ----------

async function rateLimitRedis(
  redis: UpstashRedis,
  key: string,
  maxAttempts: number,
  windowMs: number,
  blockMs: number,
): Promise<RateLimitResult> {
  const rk = `rl:${key}`;
  const bk = `rlblock:${key}`;
  const windowSec = Math.ceil(windowMs / 1000);
  const blockSec = Math.ceil(blockMs / 1000);

  // encore bloqué ?
  const ttlBlock = await redis.ttl(bk);
  if (typeof ttlBlock === "number" && ttlBlock > 0) {
    return { allowed: false, retryAfterMs: ttlBlock * 1000, backend: "redis" };
  }

  // incrémente le compteur de la fenêtre
  const count = await redis.incr(rk);
  if (count === 1) {
    await redis.expire(rk, windowSec);
  }

  if (count > maxAttempts) {
    await redis.set(bk, "1", { ex: blockSec });
    return { allowed: false, retryAfterMs: blockMs, backend: "redis" };
  }

  return { allowed: true, backend: "redis" };
}

// ---------- implémentation mémoire (repli) ----------

function rateLimitMemory(
  key: string,
  maxAttempts: number,
  windowMs: number,
  blockMs: number,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { count: 0, firstAttempt: now, blockedUntil: 0 };
    buckets.set(key, bucket);
  }

  if (now < bucket.blockedUntil) {
    return { allowed: false, retryAfterMs: bucket.blockedUntil - now, backend: "memory" };
  }

  if (now - bucket.firstAttempt > windowMs) {
    bucket.count = 0;
    bucket.firstAttempt = now;
  }

  bucket.count += 1;

  if (bucket.count > maxAttempts) {
    bucket.blockedUntil = now + blockMs;
    return { allowed: false, retryAfterMs: blockMs, backend: "memory" };
  }

  return { allowed: true, backend: "memory" };
}

// ---------- limites métier ----------

/** Authentification : 5 tentatives / 15 min, blocage 15 min */
export function authRateLimit(identifier: string) {
  return rateLimit(`auth:${identifier}`, 5, 15 * 60 * 1000, 15 * 60 * 1000);
}

/** Scans : 10 scans / heure */
export function scanRateLimit(userId: string) {
  return rateLimit(`scan:${userId}`, 10, 60 * 60 * 1000, 5 * 60 * 1000);
}
