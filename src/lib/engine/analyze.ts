/**
 * VibeClean — Analyseur
 *
 * Prend un ZIP (buffer), extrait les fichiers texte scannables,
 * et retourne les failles RÉELLEMENT détectées par le moteur à règles.
 * Plus aucune génération aléatoire : si le code est propre, 0 finding.
 */

import JSZip from "jszip";
import { analyzeFiles, isScannableFile, type Finding } from "./rules";
import { analyzeNpmDeps, analyzePythonDeps } from "./deps";

export type ScannedFile = {
  path: string;
  content: string;
  size: number;
};

export type AnalyzeResult = {
  files: ScannedFile[];
  findings: Finding[];
  stats: {
    totalEntries: number;
    scannableFiles: number;
    skippedFiles: number;
    languages: string[];
  };
};

const MAX_FILES = 2000;
const MAX_FILE_SIZE = 400_000; // 400 Ko par fichier
const MAX_TOTAL_SIZE = 60 * 1024 * 1024; // 60 Mo d'extraction max
const MAX_PATH_DEPTH = 10; // anti path abuse

/**
 * Détecte les langages/frameworks à partir des fichiers réels.
 */
function detectLanguages(files: ScannedFile[]): string[] {
  const langs = new Set<string>();

  for (const f of files) {
    const base = f.path.split("/").pop() ?? "";
    const lower = f.path.toLowerCase();

    if (/\.(ts|tsx)$/.test(base)) langs.add("TypeScript");
    else if (/\.(js|jsx|mjs|cjs)$/.test(base)) langs.add("JavaScript");
    else if (/\.py$/.test(base)) langs.add("Python");
    else if (/\.go$/.test(base)) langs.add("Go");
    else if (/\.rs$/.test(base)) langs.add("Rust");
    else if (/\.rb$/.test(base)) langs.add("Ruby");
    else if (/\.php$/.test(base)) langs.add("PHP");
    else if (/\.java$/.test(base)) langs.add("Java");

    if (base === "package.json") {
      try {
        const pkg = JSON.parse(f.content);
        if (pkg.dependencies?.next || pkg.devDependencies?.next) langs.add("Next.js");
        if (pkg.dependencies?.react || pkg.devDependencies?.react) langs.add("React");
        if (pkg.dependencies?.express) langs.add("Express");
        if (pkg.dependencies?.vue) langs.add("Vue");
        if (pkg.dependencies?.["@angular/core"]) langs.add("Angular");
      } catch {
        // package.json illisible
      }
    }
    if (base === "requirements.txt" || base === "pyproject.toml") {
      if (lower.includes("django")) langs.add("Django");
      else if (lower.includes("flask") || /flask/i.test(f.content)) langs.add("Flask");
      else langs.add("Python");
    }
    if (base === "go.mod") langs.add("Go");
    if (base === "Cargo.toml") langs.add("Rust");
  }

  return Array.from(langs);
}

/**
 * Validation de sécurité d'une archive ZIP AVANT extraction de contenu.
 * Retourne null si l'archive est saine, sinon le motif du refus.
 */
function validateZipSafety(
  entries: Array<{ name: string; dir: boolean }>,
): string | null {
  const files = entries.filter((e) => !e.dir);

  // 1. nombre de fichiers déraisonnable
  if (files.length > MAX_FILES * 2) {
    return `archive trop volumineuse (${files.length} fichiers)`;
  }

  for (const f of files) {
    const name = f.name;

    // 2. path traversal — JSZip normalise les chemins ("../x" → "x"),
    // mais on vérifie quand même le nom brut ET le nom normalisé,
    // par sécurité défensive.
    if (name.includes("..") || name.startsWith("/") || name.startsWith("\\")) {
      return `chemin dangereux : ${name}`;
    }

    // 3. noms de fichiers absolus (Windows ou Unix) qui survivraient
    // à une normalisation imparfaite
    if (/^[a-zA-Z]:[\\/]/.test(name) || /^\/[a-zA-Z]/.test(name)) {
      return `chemin absolu interdit : ${name}`;
    }

    // 4. profondeur abusive
    if (name.split("/").length > MAX_PATH_DEPTH) {
      return `chemin trop profond : ${name}`;
    }

    // 5. caractères de contrôle (null bytes etc.)
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(name)) {
      return "nom de fichier corrompu";
    }

    // 6. extensions dangereuses — on n'analyse QUE du texte, mais on
    // exclut explicitement ce qui n'a rien à faire dans un projet
    if (/\.(exe|dll|so|dylib|bat|cmd|ps1|sh|vbs)$/i.test(name)) {
      return `fichier exécutable interdit : ${name}`;
    }
  }

  return null;
}

/**
 * Extrait les fichiers scannables d'un ZIP.
 */
export async function extractFilesFromZip(zipBuffer: Buffer): Promise<{
  files: ScannedFile[];
  totalEntries: number;
  skippedFiles: number;
}> {
  // garde-fou taille d'archive
  if (zipBuffer.byteLength > 200 * 1024 * 1024) {
    throw new Error("Archive ZIP trop volumineuse (max 200 Mo).");
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  const entries = Object.values(zip.files);

  // ---- SANDBOX : validation AVANT toute lecture de contenu ----
  const rejection = validateZipSafety(entries);
  if (rejection) {
    throw new Error(`Archive refusée : ${rejection}`);
  }

  const files: ScannedFile[] = [];
  let skipped = 0;
  let totalSize = 0;

  // tri : les fichiers courts d'abord pour prioriser la couverture
  const fileEntries = entries
    .filter((e) => !e.dir)
    .sort((a, b) => {
      // priorité aux fichiers de config et au code source
      const pa = priority(a.name);
      const pb = priority(b.name);
      return pa - pb;
    });

  for (const entry of fileEntries) {
    if (files.length >= MAX_FILES) break;
    if (totalSize >= MAX_TOTAL_SIZE) break;
    if (!isScannableFile(entry.name)) {
      skipped++;
      continue;
    }

    try {
      const content = await entry.async("string");
      if (content.length > MAX_FILE_SIZE) {
        skipped++;
        continue;
      }
      files.push({ path: entry.name, content, size: content.length });
      totalSize += content.length;
    } catch {
      skipped++;
    }
  }

  return {
    files,
    totalEntries: fileEntries.length,
    skippedFiles: skipped,
  };
}

function priority(path: string): number {
  const base = path.split("/").pop() ?? "";
  if (/^\.env/.test(base)) return 0;
  if (base === "package.json") return 1;
  if (/\.(ts|tsx|js|jsx)$/.test(base)) return 2;
  if (/\.(py|go|rb|php|java)$/.test(base)) return 2;
  if (/\.(json|yml|yaml|toml)$/.test(base)) return 3;
  return 4;
}

/**
 * Analyse complète d'un ZIP : extraction + moteur à règles + dépendances.
 */
export async function analyzeZip(zipBuffer: Buffer): Promise<AnalyzeResult> {
  const { files, totalEntries, skippedFiles } = await extractFilesFromZip(zipBuffer);
  const findings = analyzeFiles(files);
  const depFindings = await analyzeDeps(files);
  findings.push(...depFindings);
  const languages = detectLanguages(files);

  return {
    files,
    findings,
    stats: {
      totalEntries,
      scannableFiles: files.length,
      skippedFiles,
      languages,
    },
  };
}

/**
 * Analyse les fichiers de dépendances (package.json / requirements.txt).
 */
async function analyzeDeps(files: ScannedFile[]): Promise<Finding[]> {
  const out: Finding[] = [];

  for (const f of files) {
    const base = (f.path.split("/").pop() ?? "").toLowerCase();

    if (base === "package.json" && !f.path.includes("node_modules")) {
      try {
        out.push(...(await analyzeNpmDeps(f.path, f.content)));
      } catch (e) {
        console.error("npm deps error", e);
      }
    }

    if (
      (base === "requirements.txt" || base === "pyproject.toml") &&
      base !== "pyproject.toml" // on parse seulement requirements pour l'instant
    ) {
      out.push(...analyzePythonDeps(f.path, f.content));
    }
  }

  return out;
}

/**
 * Analyse un code "collé" (mode manuel).
 */
export function analyzeManualCode(
  code: string,
  filename: string,
): AnalyzeResult {
  const path = filename || "snippet.txt";
  const files = [{ path, content: code, size: code.length }];
  const findings = analyzeFiles(files);
  const languages = detectLanguages(files);

  return {
    files,
    findings,
    stats: {
      totalEntries: 1,
      scannableFiles: 1,
      skippedFiles: 0,
      languages,
    },
  };
}
/**
 * Télécharge et analyse un dépôt GitHub public via son tarball.
 */
export async function analyzeGithubRepo(
  repoUrl: string,
): Promise<AnalyzeResult> {
  // normalise l'URL
  const m = repoUrl.match(/github\.com\/([\w.-]+)\/([\w.-]+)/i);
  if (!m) {
    throw new Error("URL GitHub invalide — format attendu : https://github.com/user/repo");
  }
  const [, owner, repo] = m;
  const repoClean = repo.replace(/\.git$/, "");

  // essaie main puis master
  let tarball: ArrayBuffer | null = null;
  const MAX_DOWNLOAD = 50 * 1024 * 1024; // 50 Mo max

  for (const branch of ["main", "master"]) {
    const url = `https://github.com/${owner}/${repoClean}/archive/refs/heads/${branch}.tar.gz`;
    const res = await fetch(url, {
      headers: { "User-Agent": "VibeClean-Scanner" },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000), // 30s max
    });
    if (!res.ok) continue;

    // vérifie la taille AVANT de télécharger
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_DOWNLOAD) {
      throw new Error(
        `Dépôt trop volumineux (${Math.round(declared / 1024 / 1024)} Mo > 50 Mo). Importe un ZIP partiel.`,
      );
    }

    // lit avec limite réelle (le content-length peut mentir)
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_DOWNLOAD) {
      throw new Error("Dépôt trop volumineux (> 50 Mo). Importe un ZIP partiel.");
    }
    tarball = buf;
    break;
  }

  if (!tarball) {
    throw new Error(
      "Impossible de télécharger le dépôt — vérifiez qu'il est public et que l'URL est correcte.",
    );
  }

  // décompresse le .tar.gz — on passe par gunzip natif de Node (zlib)
  const { gunzipSync } = await import("node:zlib");
  const tarBuffer = gunzipSync(Buffer.from(tarball));
  const files = parseTar(tarBuffer);

  const findings = analyzeFiles(files);
  const depFindings = await analyzeDeps(files);
  findings.push(...depFindings);
  const languages = detectLanguages(files);

  return {
    files,
    findings,
    stats: {
      totalEntries: files.length,
      scannableFiles: files.length,
      skippedFiles: 0,
      languages,
    },
  };
}

/**
 * Parse un buffer TAR (ustar) et retourne les fichiers texte.
 */
function parseTar(buffer: Buffer): ScannedFile[] {
  const files: ScannedFile[] = [];
  let offset = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);

    // bloc vide = fin d'archive
    if (header.every((b) => b === 0)) break;

    // nom du fichier (offset 0, 100 octets)
    let name = header.subarray(0, 100).toString("utf8").replace(/\0/g, "");
    // préfixe ustar (offset 345, 155 octets)
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0/g, "");
    if (prefix) name = `${prefix}/${name}`;

    // taille en octal ASCII (offset 124, 12 octets)
    const sizeStr = header.subarray(124, 136).toString("utf8").replace(/\0/g, "").trim();
    const size = parseInt(sizeStr, 8) || 0;

    // type (offset 156) : '0' ou '\0' = fichier normal
    const type = String.fromCharCode(header[156]);
    offset += 512;

    if (type === "0" || type === "\0") {
      const content = buffer.subarray(offset, offset + size);

      if (size > 0 && size <= MAX_FILE_SIZE && isScannableFile(name)) {
        files.push({
          path: name,
          content: content.toString("utf8"),
          size,
        });
      }
    }

    // avance au bloc 512 suivant (padding)
    offset += Math.ceil(size / 512) * 512;
  }

  return files.slice(0, MAX_FILES);
}
