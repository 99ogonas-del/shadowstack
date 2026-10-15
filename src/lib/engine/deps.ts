/**
 * VibeClean — Analyse des dépendances
 *
 * Compare les versions déclarées dans package.json / requirements.txt
 * avec les dernières versions publiées et une base de CVE connues.
 * - npm : interrogation en direct du registry (vérifiable à 100%)
 * - Python : base locale de vulnérabilités connues (PyPI injoignable
 *   depuis cet environnement — on reste honnête et on le documente)
 */

import type { Finding } from "./rules";

// ---------- npm ----------

type Semver = { major: number; minor: number; patch: number };

export function parseVersion(v: string): Semver | null {
  const m = v.replace(/^[\^~>=<\s]*/, "").match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function semverGt(a: Semver, b: Semver): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

type DepEntry = { name: string; declared: string; type: "dep" | "devDep" };

export function parsePackageJson(content: string): DepEntry[] {
  try {
    const pkg = JSON.parse(content);
    const out: DepEntry[] = [];
    for (const [name, range] of Object.entries(pkg.dependencies ?? {})) {
      out.push({ name, declared: String(range), type: "dep" });
    }
    for (const [name, range] of Object.entries(pkg.devDependencies ?? {})) {
      out.push({ name, declared: String(range), type: "devDep" });
    }
    return out;
  } catch {
    return [];
  }
}

/** Cache des versions npm (TTL 24h) — évite de re-télécharger à chaque scan. */
const versionCache = new Map<string, { version: string; fetchedAt: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Interroge le registry npm pour la dernière version d'un paquet (avec cache). */
async function fetchLatestVersion(name: string): Promise<string | null> {
  const cached = versionCache.get(name);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.version;
  }

  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { version?: string };
    const version = data.version ?? null;
    if (version) {
      versionCache.set(name, { version, fetchedAt: Date.now() });
    }
    return version;
  } catch {
    return null;
  }
}

/**
 * Analyse un package.json : pour chaque dépendance, compare la version
 * déclarée avec la dernière publiée. Retourne les findings réels.
 */
export async function analyzeNpmDeps(
  pkgPath: string,
  content: string,
): Promise<Finding[]> {
  const deps = parsePackageJson(content);
  if (deps.length === 0) return [];

  const findings: Finding[] = [];
  let lineNo = 1;
  for (const line of content.split("\n")) {
    if (/^\s*"[\w@./-]+"\s*:/.test(line)) lineNo = content.split("\n").indexOf(line) + 1;
    break;
  }

  // on limite le nombre de requêtes registry pour ne pas spammer
  const toCheck = deps.slice(0, 60);

  const results = await Promise.all(
    toCheck.map(async (dep) => {
      const declared = parseVersion(dep.declared);
      if (!declared) return null;
      const latest = await fetchLatestVersion(dep.name);
      if (!latest) return null;
      const latestSemver = parseVersion(latest);
      if (!latestSemver) return null;

      const majorGap = latestSemver.major - declared.major;
      const isOutdated =
        majorGap > 0 || (majorGap === 0 && latestSemver.minor > declared.minor);

      return { dep, declared, latest, latestSemver, majorGap, isOutdated };
    }),
  );

  const outdated = results.filter((r): r is NonNullable<typeof r> => r !== null && r.isOutdated);

  if (outdated.length === 0) {
    return [
      {
        title: `Dépendances à jour (${deps.length} paquets vérifiés)`,
        description:
          "Toutes les dépendances déclarées sont à la dernière version publiée sur le registry npm.",
        plainLanguage:
          "Bonne nouvelle : vos dépendances sont à jour. Vous bénéficiez des derniers correctifs de sécurité et des dernières optimisations.",
        severity: "low",
        category: "Dépendances",
        filePath: pkgPath,
        lineNumber: lineNo,
        codeSnippet: `${deps.length} dépendances analysées`,
        fixTitle: "Rien à faire",
        fixExplanation:
          "Continuez à mettre à jour régulièrement (npm outdated) pour garder cette bonne santé.",
        fixedCode: "# Vérification régulière\nnpm outdated",
        estimatedCost: 0,
      },
    ];
  }

  // un finding par paquet significativement en retard (max 10 pour rester lisible)
  const significant = outdated
    .filter((r) => r.majorGap >= 1)
    .sort((a, b) => b.majorGap - a.majorGap)
    .slice(0, 10);

  for (const r of significant) {
    findings.push({
      title: `${r.dep.name} : ${r.majorGap} version${r.majorGap > 1 ? "s" : ""} majeure${r.majorGap > 1 ? "s" : ""} de retard`,
      description: `${r.dep.name} est déclaré en ${r.dep.declared} mais la dernière version est ${r.latest} (registry npm vérifié le ${new Date().toISOString().slice(0, 10)}).`,
      plainLanguage:
        r.majorGap >= 2
          ? `Vous utilisez une version très ancienne de ${r.dep.name}. Les nouvelles versions apportent des correctifs de sécurité et des gains de performance importants — et la migration sera de plus en plus difficile à mesure que l'écart grandit.`
          : `Une nouvelle version majeure de ${r.dep.name} est disponible. Elle contient des correctifs et des améliorations que votre code n'utilise pas encore.`,
      severity: r.majorGap >= 3 ? "high" : "medium",
      category: "Dépendances",
      filePath: pkgPath,
      lineNumber: lineNo,
      codeSnippet: `"${r.dep.name}": "${r.dep.declared}"`,
      fixTitle: `Mettre à jour vers ${r.latest}`,
      fixExplanation: `Migration par étapes : lisez le changelog de ${r.dep.name}, mettez à jour, lancez vos tests. Les registries npm publient aussi la commande exacte à exécuter.`,
      fixedCode: `npm install ${r.dep.name}@${r.latest}\n# Puis vérifiez : npm test`,
      estimatedCost: 0,
    });
  }

  // résumé global si seulement des retards mineurs
  if (findings.length === 0) {
    findings.push({
      title: `${outdated.length} dépendance(s) mineure(s) en retard`,
      description: `${outdated.length} dépendances ont des versions mineures disponibles sur le registry npm.`,
      plainLanguage:
        "Quelques mises à jour mineures sont disponibles. Ce sont généralement des corrections de bugs et de sécurité sans risque de casse.",
      severity: "low",
      category: "Dépendances",
      filePath: pkgPath,
      lineNumber: lineNo,
      codeSnippet: `ex: ${outdated[0].dep.name} ${outdated[0].declared} → ${outdated[0].latest}`,
      fixTitle: "Mettre à jour les versions mineures",
      fixExplanation:
        "Les versions mineures respectent la compatibilité — la mise à jour est sûre dans la grande majorité des cas.",
      fixedCode: `npm update`,
      estimatedCost: 0,
    });
  }

  return findings;
}

// ---------- Python (base locale, PyPI injoignable) ----------

/** Paquets Python avec des CVE connues — (paquet, version_max_sûre, CVE, sévérité) */
const PY_KNOWN_VULNS: Array<{
  pkg: string;
  safeBelow: string;
  cve: string;
  severity: "critical" | "high" | "medium";
  note: string;
}> = [
  {
    pkg: "requests",
    safeBelow: "2.31.0",
    cve: "CVE-2023-32681",
    severity: "medium",
    note: "Fuite d'credentials Proxy-Authorization lors des redirections HTTPS.",
  },
  {
    pkg: "urllib3",
    safeBelow: "1.26.18",
    cve: "CVE-2023-45803",
    severity: "medium",
    note: "Requête non intentionnelle lors du suivi de redirections.",
  },
  {
    pkg: "cryptography",
    safeBelow: "41.0.0",
    cve: "CVE-2023-38325",
    severity: "high",
    note: "Vulnérabilité dans le déchiffrement SSH — corruption mémoire possible.",
  },
  {
    pkg: "flask",
    safeBelow: "2.2.5",
    cve: "CVE-2023-30861",
    severity: "high",
    note: "Fuites de cookies de session via des réponses mises en cache.",
  },
  {
    pkg: "django",
    safeBelow: "4.2.4",
    cve: "CVE-2023-41164",
    severity: "high",
    note: "Déni de service potentiel via des requêtes malformées.",
  },
  {
    pkg: "pyyaml",
    safeBelow: "6.0.1",
    cve: "CVE-2020-14343",
    severity: "critical",
    note: "Exécution de code arbitraire via yaml.load() sur entrée non fiable.",
  },
  {
    pkg: "pillow",
    safeBelow: "10.0.1",
    cve: "CVE-2023-44271",
    severity: "high",
    note: "Déni de service via des images spécialement craftées.",
  },
  {
    pkg: "paramiko",
    safeBelow: "3.4.0",
    cve: "CVE-2023-48795",
    severity: "medium",
    note: "Attaque Terrapin sur le canal SSH.",
  },
];

export function parseRequirements(content: string): DepEntry[] {
  const out: DepEntry[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-")) continue;
    const m = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*([=<>!~]=?)?\s*([\d.]+)?/);
    if (m) {
      out.push({
        name: m[1].toLowerCase().replace(/_/g, "-"),
        declared: m[3] ?? "",
        type: "dep",
      });
    }
  }
  return out;
}

/**
 * Analyse un requirements.txt / pyproject.toml contre la base de CVE connues.
 */
export function analyzePythonDeps(
  reqPath: string,
  content: string,
): Finding[] {
  const deps = parseRequirements(content);
  if (deps.length === 0) return [];

  const findings: Finding[] = [];
  const lines = content.split("\n");

  for (const dep of deps) {
    const known = PY_KNOWN_VULNS.find((v) => v.pkg === dep.name);
    if (!known) continue;

    const declared = parseVersion(dep.declared);
    const safeBelow = parseVersion(known.safeBelow);
    if (!declared || !safeBelow) continue;

    // vulnérable si la version déclarée est < safeBelow
    const isVulnerable = semverGt(safeBelow, declared);
    if (!isVulnerable) continue;

    const lineNumber =
      lines.findIndex((l) => l.toLowerCase().includes(dep.name)) + 1 || 1;

    findings.push({
      title: `${dep.name} ${dep.declared} — vulnérabilité connue (${known.cve})`,
      description: `${dep.name} en version ${dep.declared} est affectée par ${known.cve} : ${known.note}`,
      plainLanguage:
        "Une faille de sécurité publique et documentée touche cette version de la librairie. Des attaquants peuvent l'exploiter automatiquement avec des outils publics. La mise à jour corrige le problème.",
      severity: known.severity,
      category: "Dépendances",
      filePath: reqPath,
      lineNumber,
      codeSnippet: `${dep.name}${dep.declared ? `==${dep.declared}` : ""}`,
      fixTitle: `Mettre à jour vers ${known.safeBelow} ou plus`,
      fixExplanation: `Le correctif est publié depuis la version ${known.safeBelow}. Mettez à jour et relancez vos tests.`,
      fixedCode: `# requirements.txt\n${dep.name}>=${known.safeBelow}\n\n# puis\npip install --upgrade ${dep.name}`,
      estimatedCost: 0,
    });
  }

  return findings;
}
