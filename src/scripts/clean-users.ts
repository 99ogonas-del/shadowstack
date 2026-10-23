import { db, pool } from "@/db";
import { users } from "@/db/schema";
import { ne } from "drizzle-orm";

async function main() {
  const kept = "alhass.sanogo@gmail.com";

  // Lister les comptes à supprimer
  const toDelete = await db
    .select({ id: users.id, email: users.email, role: users.role })
    .from(users)
    .where(ne(users.email, kept));

  console.log(`Comptes à supprimer : ${toDelete.length}`);
  for (const u of toDelete) {
    console.log(`  - ${u.email} (${u.id}, role=${u.role})`);
  }

  if (toDelete.length === 0) {
    console.log("Rien à supprimer.");
    await pool.end();
    return;
  }

  // Suppression (cascade gère sessions, projects, scans, findings, activity, password_resets)
  const result = await db.delete(users).where(ne(users.email, kept));
  console.log(`Supprimés : ${result.rowCount ?? toDelete.length} compte(s).`);

  // Vérification
  const remaining = await db.select({ email: users.email, role: users.role }).from(users);
  console.log(`Comptes restants : ${remaining.length}`);
  for (const u of remaining) {
    console.log(`  ✓ ${u.email} (role=${u.role})`);
  }

  await pool.end();
}

main().catch((e) => {
  console.error("ERREUR :", e instanceof Error ? e.message : e);
  process.exit(1);
});
