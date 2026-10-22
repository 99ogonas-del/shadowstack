/**
 * Crée le compte admin ShadowStack dans la base connectée (DATABASE_URL),
 * de façon idempotente : si admin@shadowstack.app existe déjà, rien n'est fait.
 * Usage : DATABASE_URL=... npx tsx src/scripts/create-admin.ts
 */
import { db, pool } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

async function main() {
  const email = "admin@shadowstack.app";
  const existing = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Admin DÉJÀ présent (${existing[0].id}, role=${existing[0].role})`);
    await pool.end();
    return;
  }

  const id = crypto.randomBytes(16).toString("hex");
  const passwordHash = bcrypt.hashSync("Admin#2026", 12);
  await db
    .insert(users)
    .values({
      id,
      email,
      emailVerified: true,
      passwordHash,
      name: "Admin",
      role: "admin",
      totpEnabled: false,
    })
    .execute();

  console.log(`Admin CRÉÉ : ${id}`);
  await pool.end();
}

main().catch((e) => {
  console.error("ERREUR :", e instanceof Error ? e.message : e);
  process.exit(1);
});
