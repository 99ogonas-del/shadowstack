import { NextResponse } from "next/server";
import { sql, count } from "drizzle-orm";
import { db } from "@/db";
import { users, projects, scans, findings, auditLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/stats
 * Statistiques de la plateforme — réservé aux admins.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (e) {
    const msg = (e as Error).message;
    return NextResponse.json(
      { error: msg === "Forbidden" ? "Accès refusé" : "Non autorisé" },
      { status: msg === "Forbidden" ? 403 : 401 },
    );
  }

  const [
    usersCount,
    verifiedCount,
    adminCount,
    projectsCount,
    scansCount,
    findingsCount,
    findingsBySeverity,
    planBreakdown,
    recentSignups,
  ] = await Promise.all([
    db.select({ n: count() }).from(users),
    db.select({ n: count() }).from(users).where(sql`${users.emailVerified} = true`),
    db.select({ n: count() }).from(users).where(sql`${users.role} = 'admin'`),
    db.select({ n: count() }).from(projects),
    db.select({ n: count() }).from(scans),
    db.select({ n: count() }).from(findings),
    db
      .select({ severity: findings.severity, n: count() })
      .from(findings)
      .groupBy(findings.severity),
    db
      .select({ plan: users.plan, n: count() })
      .from(users)
      .groupBy(users.plan),
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        plan: users.plan,
        role: users.role,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(sql`${users.createdAt} desc`)
      .limit(10),
  ]);

  return NextResponse.json({
    users: usersCount[0]?.n ?? 0,
    verifiedUsers: verifiedCount[0]?.n ?? 0,
    admins: adminCount[0]?.n ?? 0,
    projects: projectsCount[0]?.n ?? 0,
    scans: scansCount[0]?.n ?? 0,
    findings: findingsCount[0]?.n ?? 0,
    findingsBySeverity: Object.fromEntries(
      findingsBySeverity.map((r) => [r.severity, r.n]),
    ),
    planBreakdown: Object.fromEntries(
      planBreakdown.map((r) => [r.plan, r.n]),
    ),
    recentSignups,
    requestedBy: admin.email,
  });
}
