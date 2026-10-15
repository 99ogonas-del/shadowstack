import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { findings, projects, activity } from "@/db/schema";
import {
  generateActivityId,
  requireUser,
} from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const f = await db
    .select({ finding: findings, project: projects })
    .from(findings)
    .innerJoin(projects, eq(findings.projectId, projects.id))
    .where(eq(findings.id, id))
    .limit(1);

  if (f.length === 0 || f[0].project.userId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await db
    .update(findings)
    .set({ fixed: true })
    .where(eq(findings.id, id));

  // journal d'audit
  await logAudit({
    userId: user.id,
    action: "finding_fixed",
    details: { findingId: id, title: f[0].finding.title },
    ip: getClientIp(_req),
  });

  // Recompute project health score after fix
  const all = await db
    .select()
    .from(findings)
    .where(eq(findings.projectId, f[0].project.id));

  let score = 95;
  all.forEach((x) => {
    if (x.fixed) return;
    if (x.severity === "critical") score -= 22;
    else if (x.severity === "high") score -= 12;
    else if (x.severity === "medium") score -= 6;
    else if (x.severity === "low") score -= 2;
  });
  score = Math.max(20, Math.min(100, score));

  await db
    .update(projects)
    .set({ healthScore: score })
    .where(eq(projects.id, f[0].project.id));

  // Log activity
  await db.insert(activity).values({
    id: generateActivityId(),
    userId: user.id,
    projectId: f[0].project.id,
    type: "fix_applied",
    message: `Correction appliquée : ${f[0].finding.title}`,
    createdAt: new Date(),
  });

  return NextResponse.json({ ok: true, newScore: score });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  const f = await db
    .select({ finding: findings, project: projects })
    .from(findings)
    .innerJoin(projects, eq(findings.projectId, projects.id))
    .where(eq(findings.id, id))
    .limit(1);

  if (f.length === 0 || f[0].project.userId !== user.id) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  await db
    .update(findings)
    .set({ fixed: false })
    .where(eq(findings.id, id));

  // journal d'audit
  await logAudit({
    userId: user.id,
    action: "finding_unfixed",
    details: { findingId: id, title: f[0].finding.title },
    ip: getClientIp(_req),
  });

  // Recalcule le score du projet (comme pour le POST)
  const all = await db
    .select()
    .from(findings)
    .where(eq(findings.projectId, f[0].project.id));

  let score = 95;
  all.forEach((x) => {
    if (x.fixed) return;
    if (x.severity === "critical") score -= 22;
    else if (x.severity === "high") score -= 12;
    else if (x.severity === "medium") score -= 6;
    else if (x.severity === "low") score -= 2;
  });
  score = Math.max(20, Math.min(100, score));

  await db
    .update(projects)
    .set({ healthScore: score })
    .where(eq(projects.id, f[0].project.id));

  return NextResponse.json({ ok: true, newScore: score });
}
