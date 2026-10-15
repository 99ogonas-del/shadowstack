import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { db } from "@/db";
import {
  users,
  projects,
  scans,
  findings,
  activity,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import {
  generateActivityId,
  generateFindingId,
  generateProjectId,
  generateScanId,
  generateUserId,
} from "@/lib/auth";
import { analyzeFiles } from "@/lib/engine/rules";
import { analyzeNpmDeps, analyzePythonDeps } from "@/lib/engine/deps";
import type { Finding } from "@/lib/engine/rules";

// ---------- lecture réelle d'un dossier de code ----------

const IGNORED_DIRS = [
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
];

function walkDir(dir: string, base = ""): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.includes(entry)) continue;
    const full = join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      files.push(...walkDir(full, rel));
    } else if (st.isFile() && st.size < 400_000) {
      try {
        files.push({ path: rel, content: readFileSync(full, "utf8") });
      } catch {
        // binaire ou illisible — ignoré
      }
    }
  }
  return files;
}

function detectLanguages(files: Array<{ path: string; content: string }>): string[] {
  const langs = new Set<string>();
  for (const f of files) {
    const base = f.path.split("/").pop() ?? "";
    if (/\.(ts|tsx)$/.test(base)) langs.add("TypeScript");
    else if (/\.(js|jsx|mjs|cjs)$/.test(base)) langs.add("JavaScript");
    else if (/\.py$/.test(base)) langs.add("Python");
    if (base === "package.json") {
      try {
        const pkg = JSON.parse(f.content);
        if (pkg.dependencies?.next || pkg.devDependencies?.next) langs.add("Next.js");
        if (pkg.dependencies?.react || pkg.devDependencies?.react) langs.add("React");
      } catch {
        // illisible
      }
    }
  }
  return Array.from(langs);
}

/** Analyse RÉELLE d'un dossier sur le disque avec le moteur à règles. */
async function scanRealDirectory(dirPath: string): Promise<{
  findings: Finding[];
  languages: string[];
  fileCount: number;
}> {
  const files = walkDir(dirPath);
  const findings = analyzeFiles(files);

  for (const f of files) {
    const base = (f.path.split("/").pop() ?? "").toLowerCase();
    if (base === "package.json" && !f.path.includes("node_modules")) {
      findings.push(...(await analyzeNpmDeps(f.path, f.content)));
    }
    if (base === "requirements.txt") {
      findings.push(...analyzePythonDeps(f.path, f.content));
    }
  }

  return {
    findings,
    languages: detectLanguages(files),
    fileCount: files.length,
  };
}

function computeHealthScore(findings: Finding[]): number {
  let score = 95;
  for (const f of findings) {
    if (f.severity === "critical") score -= 22;
    else if (f.severity === "high") score -= 12;
    else if (f.severity === "medium") score -= 6;
    else if (f.severity === "low") score -= 2;
  }
  return Math.max(20, Math.min(100, score));
}

// ---------- seed ----------

export async function seedDatabase(): Promise<void> {
  // Idempotent : ne seed que si aucun utilisateur n'existe
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) return;

  const demoUserId = generateUserId();
  const passwordHash = await hashPassword("demo1234");

  await db.insert(users).values({
    id: demoUserId,
    email: "demo@vibeclean.app",
    name: "Ogions D.",
    passwordHash,
    plan: "Pro",
    avatarColor: "#8b5cf6",
  });

  // Projet RÉEL : elegancebystellaecommerce, scanné avec le vrai moteur
  const realProjectDir = "/home/ogonas/elegancebystellaecommerce";
  const projectId = generateProjectId();

  let scanResult;
  try {
    scanResult = await scanRealDirectory(realProjectDir);
  } catch (e) {
    console.error("scan réel échoué", e);
    scanResult = { findings: [], languages: [], fileCount: 0 };
  }

  const healthScore = computeHealthScore(scanResult.findings);
  const languages = scanResult.languages;

  await db.insert(projects).values({
    id: projectId,
    userId: demoUserId,
    name: "elegancebystella",
    description: "Site e-commerce Next.js pour une boutique de robes de soirée.",
    source: "github",
    sourceUrl: "https://github.com/ogdiverse/elegancebystella",
    language: languages[0] ?? "TypeScript",
    framework:
      languages.find((l) => ["Next.js", "React"].includes(l)) ?? "Next.js",
    healthScore,
    createdAt: new Date("2026-09-22T14:32:00Z"),
  });

  const scanId = generateScanId();
  const completedAt = new Date("2026-09-28T14:32:47Z");
  await db.insert(scans).values({
    id: scanId,
    projectId,
    type: "full",
    status: "completed",
    progress: 100,
    durationMs: 47200,
    completedAt,
    createdAt: new Date("2026-09-28T14:32:00Z"),
  });

  for (const f of scanResult.findings) {
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

  // Activity feed — alignée sur les données réelles
  const now = new Date();
  await db.insert(activity).values([
    {
      id: generateActivityId(),
      userId: demoUserId,
      type: "scan_completed",
      message: `Analyse terminée pour elegancebystella — score ${healthScore}/100 (${scanResult.findings.length} constats)`,
      createdAt: new Date(now.getTime() - 1000 * 60 * 15),
    },
    {
      id: generateActivityId(),
      userId: demoUserId,
      type: "project_added",
      message: "Projet elegancebystella connecté depuis GitHub",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 72),
    },
  ]);
}
