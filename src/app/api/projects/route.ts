import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { projects, scans, findings, activity } from "@/db/schema";
import {
  generateProjectId,
  generateScanId,
  generateFindingId,
  generateActivityId,
  requireUser,
} from "@/lib/auth";
import { analyzeZip, analyzeManualCode, analyzeGithubRepo } from "@/lib/engine/analyze";
import type { Finding } from "@/lib/engine/rules";
import { logAudit, getClientIp } from "@/lib/audit";

const FRAMEWORKS = [
  "Next.js",
  "React",
  "Vue",
  "Angular",
  "Express",
  "Django",
  "Flask",
];

function pickFramework(languages: string[], fallback: string | null): string | null {
  return (
    languages.find((l) => FRAMEWORKS.includes(l)) ?? fallback ?? null
  );
}

export async function POST(req: NextRequest) {
  const scanStart = Date.now();
  const ip = getClientIp(req);
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // ---- Contrôle : email vérifié obligatoire pour scanner ----
  // Empêche la création de comptes jetables pour spammer le moteur
  if (!user.emailVerified) {
    return NextResponse.json(
      {
        error:
          "Confirme ton adresse email avant de lancer une analyse. Vérifie ta boîte mail.",
        code: "EMAIL_NOT_VERIFIED",
      },
      { status: 403 },
    );
  }

  // Rate limiting : 10 scans / heure par utilisateur
  const { scanRateLimit } = await import("@/lib/rate-limit");
  const limit = await scanRateLimit(user.id);
  if (!limit.allowed) {
    const minutes = Math.ceil((limit.retryAfterMs ?? 0) / 60000);
    return NextResponse.json(
      {
        error: `Limite de scans atteinte. Réessayez dans ${minutes} minute${minutes > 1 ? "s" : ""}.`,
      },
      { status: 429 },
    );
  }

  // Quota du plan Free : 3 scans au total (le plan Pro est illimité)
  if (user.plan === "Free") {
    const scanCount = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(scans)
      .innerJoin(projects, eq(scans.projectId, projects.id))
      .where(eq(projects.userId, user.id));
    const used = scanCount[0]?.n ?? 0;
    if (used >= 3) {
      return NextResponse.json(
        {
          error:
            "Tu as utilisé tes 3 scans inclus du plan gratuit. Passe au plan Pro pour des scans illimités.",
        },
        { status: 403 },
      );
    }
  }

  const contentType = req.headers.get("content-type") ?? "";

  // Le client envoie soit du multipart (ZIP), soit du JSON (GitHub / code collé).
  // Le body ne peut être lu qu'une seule fois.
  let fields: Record<string, string> = {};
  let zipFile: File | null = null;

  if (contentType.includes("application/json")) {
    const json = (await req.json()) as Record<string, unknown>;
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === "string") fields[k] = v;
    }
  } else {
    const form = await req.formData();
    for (const [k, v] of form.entries()) {
      if (typeof v === "string") fields[k] = v;
    }
    const zip = form.get("zip");
    if (zip instanceof File && zip.size > 0) zipFile = zip;
  }

  const source = fields.source ?? "github";
  const name = fields.name ?? "";
  const description = fields.description ?? "";
  const language = fields.language ?? "";
  const framework = fields.framework ?? "";
  const sourceUrl = fields.sourceUrl ?? "";
  const type = fields.type ?? "full";
  const manualCode = fields.code ?? "";
  const manualFilename = fields.filename ?? "";

  if (!name) {
    return NextResponse.json(
      { error: "Le nom du projet est requis" },
      { status: 400 },
    );
  }

  const projectId = generateProjectId();

  // ---- VRAI MOTEUR D'ANALYSE ----
  // Le contenu réel (ZIP / GitHub / code collé) est analysé par les règles.
  // Aucune génération aléatoire : code propre → 0 finding.
  let computedLang: string | null = language || null;
  let computedFramework: string | null = framework || null;
  let vulnerabilitiesFound: Finding[] = [];
  let engineError: string | null = null;

  try {
    if (source === "zip" && zipFile && zipFile.size > 0) {
      const buf = Buffer.from(await zipFile.arrayBuffer());
      const result = await analyzeZip(buf);
      vulnerabilitiesFound = result.findings;
      if (!computedLang && result.stats.languages.length > 0) {
        computedLang = result.stats.languages[0];
      }
      computedFramework = pickFramework(result.stats.languages, computedFramework);
    } else if (source === "manual" && manualCode.trim().length > 0) {
      const result = analyzeManualCode(manualCode, manualFilename);
      vulnerabilitiesFound = result.findings;
      if (!computedLang && result.stats.languages.length > 0) {
        computedLang = result.stats.languages[0];
      }
      computedFramework = pickFramework(result.stats.languages, computedFramework);
    } else if (source === "github" && sourceUrl) {
      const result = await analyzeGithubRepo(sourceUrl);
      vulnerabilitiesFound = result.findings;
      if (!computedLang && result.stats.languages.length > 0) {
        computedLang = result.stats.languages[0];
      }
      computedFramework = pickFramework(result.stats.languages, computedFramework);
    }
  } catch (e) {
    console.error("engine error", e);
    // on ne renvoie JAMAIS le détail technique au client
    engineError =
      process.env.NODE_ENV === "production"
        ? "L'analyse a échoué. Réessayez ou contacte le support."
        : e instanceof Error
          ? e.message
          : "Erreur d'analyse";
  }

  if (engineError) {
    return NextResponse.json({ error: engineError }, { status: 400 });
  }

  if (!computedLang) computedLang = language || "TypeScript";
  if (!computedFramework) computedFramework = framework || "Next.js";

  // Score santé basé sur les failles RÉELLES trouvées
  let healthScore = 95;
  vulnerabilitiesFound.forEach((f) => {
    if (f.severity === "critical") healthScore -= 22;
    else if (f.severity === "high") healthScore -= 12;
    else if (f.severity === "medium") healthScore -= 6;
    else if (f.severity === "low") healthScore -= 2;
  });
  healthScore = Math.max(20, Math.min(100, healthScore));

  await db.insert(projects).values({
    id: projectId,
    userId: user.id,
    name: name.trim(),
    description: description || null,
    source,
    sourceUrl: sourceUrl || null,
    language: computedLang,
    framework: computedFramework,
    healthScore,
    createdAt: new Date(),
  });

  // Un scan par analyse — durée RÉELLE mesurée depuis le début du handler
  const scanId = generateScanId();
  const completedAt = new Date();
  const scanDuration = completedAt.getTime() - scanStart;
  const createdAt = new Date(scanStart);

  await db.insert(scans).values({
    id: scanId,
    projectId,
    type:
      type === "security"
        ? "security"
        : type === "cleanup"
          ? "cleanup"
          : type === "costs"
            ? "costs"
            : "full",
    status: "completed",
    progress: 100,
    durationMs: scanDuration,
    completedAt,
    createdAt,
  });

  for (const f of vulnerabilitiesFound) {
    await db.insert(findings).values({
      id: generateFindingId(),
      scanId,
      projectId,
      title: f.title,
      description: f.description,
      plainLanguage: f.plainLanguage,
      severity: f.severity,
      category: f.category,
      filePath: f.filePath,
      lineNumber: f.lineNumber,
      codeSnippet: f.codeSnippet,
      fixTitle: f.fixTitle,
      fixExplanation: f.fixExplanation,
      fixedCode: f.fixedCode,
      fixed: false,
      estimatedCost: f.estimatedCost ?? null,
    });
  }

  await db.insert(activity).values({
    id: generateActivityId(),
    userId: user.id,
    projectId,
    type: "scan_completed",
    message: `Analyse terminée pour ${name} — score ${healthScore}/100 (${vulnerabilitiesFound.length} constat${vulnerabilitiesFound.length === 1 ? "" : "s"})`,
    createdAt: new Date(),
  });

  // journal d'audit
  await logAudit({
    userId: user.id,
    action: "scan_started",
    details: {
      project: name,
      source,
      findings: vulnerabilitiesFound.length,
      healthScore,
      durationMs: scanDuration,
    },
    ip,
  });

  return NextResponse.json({
    ok: true,
    projectId,
    findingsCount: vulnerabilitiesFound.length,
    healthScore,
  });
}

export async function GET(req: NextRequest) {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, user.id));

  return NextResponse.json({ projects: rows });
}
