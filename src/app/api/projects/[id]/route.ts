import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, scans, findings, activity } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;

  // on récupère le nom avant suppression (pour le journal)
  const target = await db
    .select({ name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .limit(1);

  // CRITIQUE : on ne supprime QUE si le projet appartient à l'utilisateur.
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
    .returning({ id: projects.id });

  if (deleted.length === 0) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // journal d'audit
  await logAudit({
    userId: user.id,
    action: "project_deleted",
    details: { projectId: id, name: target[0]?.name ?? null },
    ip: getClientIp(_req),
  });

  return NextResponse.json({ ok: true });
}
