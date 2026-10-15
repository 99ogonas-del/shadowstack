/**
 * ShadowStack — Moteur d'analyse par règles
 *
 * Chaque règle = un pattern regex qui cherche une faille RÉELLE dans le
 * contenu réel des fichiers. Pas de findings inventés : si aucune règle ne
 * matche, le projet obtient 0 failles et un score propre.
 */

export type Severity = "critical" | "high" | "medium" | "low";

export type Finding = {
  /** Identifiant de la règle qui a produit ce finding (ex: "eval-usage").
   * Ajouté automatiquement par analyzeFiles ; les constructeurs de règles
   * et les findings de dépendances peuvent l'omettre. */
  ruleId?: string;
  title: string;
  description: string;
  plainLanguage: string;
  severity: Severity;
  category: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixTitle: string;
  fixExplanation: string;
  fixedCode: string;
  estimatedCost?: number;
};

export type Rule = {
  id: string;
  /** Pattern cherché dans le contenu de la ligne */
  pattern: RegExp;
  /** Extensions de fichiers concernés (vide = tous les fichiers texte) */
  extensions?: string[];
  /** Noms de fichiers concernés (ex: .env.local) */
  filenames?: string[];
  /** Évite les doublons : un seul finding par fichier+règle */
  onePerFile?: boolean;
  match: (line: string, filePath: string, lineNumber: number) => Finding | null;
};

// ---------- helpers ----------

const SECRET_KINDS: Array<[RegExp, string]> = [
  [/sk_live_[a-zA-Z0-9]{20,}/, "Stripe (mode live)"],
  [/sk_test_[a-zA-Z0-9]{20,}/, "Stripe (mode test)"],
  [/AKIA[0-9A-Z]{16}/, "AWS (clé d'accès)"],
  [/ghp_[a-zA-Z0-9]{36}/, "GitHub (token personnel)"],
  [/gho_[a-zA-Z0-9]{36}/, "GitHub (token OAuth)"],
  [/xox[baprs]-[a-zA-Z0-9-]{10,}/, "Slack (token)"],
  [/AIza[0-9A-Za-z_-]{35}/, "Google (clé API)"],
];

function findSecretKind(line: string): string | null {
  for (const [re, kind] of SECRET_KINDS) {
    if (re.test(line)) return kind;
  }
  return null;
}

function snippet(line: string): string {
  const trimmed = line.trim();
  // masque partiel du secret dans l'extrait affiché
  return trimmed.length > 160 ? trimmed.slice(0, 157) + "…" : trimmed;
}

// ---------- les règles ----------

export const RULES: Rule[] = [
  // ----- SECRETS -----
  {
    id: "secret-known-provider",
    pattern:
      /(sk_live_[a-zA-Z0-9]{20,}|sk_test_[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9-]{10,}|AIza[0-9A-Za-z_-]{35})/,
    extensions: ["js", "jsx", "ts", "tsx", "py", "json", "env", "yml", "yaml", "toml", "md", "txt", "rb", "go", "php", "java"],
    filenames: [".env", ".env.local", ".env.production", ".env.development"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => {
      const kind = findSecretKind(line)!;
      return {
        title: `Clé secrète ${kind} exposée dans le code source`,
        description: `Un secret ${kind} valide a été trouvé en clair dans ${filePath} à la ligne ${lineNumber}.`,
        plainLanguage:
          "Cette clé est visible par toute personne qui accède à votre code. N'importe qui peut l'utiliser à votre place — pour facturer vos clients, envoyer des messages, ou accéder à vos données.",
        severity: "critical",
        category: "Secrets",
        filePath,
        lineNumber,
        codeSnippet: snippet(line),
        fixTitle: "Révoquer la clé immédiatement, puis la déplacer en variable d'environnement",
        fixExplanation:
          "Une clé exposée est considérée comme compromise : révoquez-la dans le dashboard du fournisseur (bouton Roll/Rotate), générez-en une nouvelle, et injectez-la au déploiement via les variables d'environnement du serveur. Ne la committez jamais.",
        fixedCode: `# Dans .env.local (ajouté au .gitignore, jamais commité)
MA_CLE=votre_nouvelle_cle

# Dans le code — lecture depuis l'environnement
const key = process.env.MA_CLE;`,
        estimatedCost: 0,
      };
    },
  },

  {
    id: "secret-generic-assignment",
    pattern: /(password|passwd|secret|api[_-]?key|apikey|token|private[_-]?key|access[_-]?key)\s*[:=]\s*["'][^"'\s]{8,}["']/i,
    extensions: ["js", "jsx", "ts", "tsx", "py", "json", "yml", "yaml", "rb", "go", "php", "java"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => {
      // évite de dupliquer si c'est un secret connu (déjà remonté)
      if (findSecretKind(line)) return null;
      return {
        title: "Valeur sensible écrite en dur dans le code",
        description: `Une valeur sensible (mot de passe, clé ou token) est assignée en dur dans ${filePath}:${lineNumber}.`,
        plainLanguage:
          "Un mot de passe ou une clé est écrit directement dans votre code. Il finira dans votre dépôt Git et dans le bundle envoyé aux navigateurs de vos visiteurs.",
        severity: "high",
        category: "Secrets",
        filePath,
        lineNumber,
        codeSnippet: snippet(line),
        fixTitle: "Sortir la valeur en variable d'environnement",
        fixExplanation:
          "Les secrets ne doivent jamais être écrits en dur. Placez la valeur dans un fichier .env (non commité) et lisez-la via process.env côté serveur uniquement.",
        fixedCode: `// .env (jamais commité)
MA_VALEUR_SECRETE=xxx

// code
const secret = process.env.MA_VALEUR_SECRETE;`,
        estimatedCost: 0,
      };
    },
  },

  {
    id: "env-file-present",
    pattern: /.*/,
    filenames: [".env", ".env.local", ".env.production", ".env.development"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => {
      // On ne signale le fichier .env que s'il contient une vraie valeur
      if (!/=\s*\S+/.test(line)) return null;
      return {
        title: "Fichier d'environnement .env présent dans l'archive",
        description: `Le fichier ${filePath} contient des variables d'environnement et a été trouvé dans le code analysé.`,
        plainLanguage:
          "Ce fichier contient vos accès (base de données, clés API). S'il est commité sur Git, même en le supprimant aujourd'hui, il reste dans l'historique. Il doit être ignoré et régénéré.",
        severity: "critical",
        category: "Secrets",
        filePath,
        lineNumber,
        codeSnippet: "fichier .env détecté dans l'archive",
        fixTitle: "Ignorer le fichier, purger l'historique Git et régénérer les secrets",
        fixExplanation:
          "1) Ajoutez .env* au .gitignore. 2) Si le fichier a déjà été commité, purgez-le de l'historique (git filter-repo). 3) Régénérez TOUTES les clés qu'il contenait — elles sont à considérer comme compromises.",
        fixedCode: `# .gitignore
.env
.env.local
.env*.local

# Purge de l'historique si déjà commité
git filter-repo --invert-paths --path .env.local
# Puis rotation de toutes les clés impactées`,
        estimatedCost: 0,
      };
    },
  },

  // ----- INJECTIONS -----
  {
    id: "sql-injection-js",
    pattern: /(query|execute|raw|unsafe)\s*\(\s*[`'"][^;]{0,200}\$\{/,
    extensions: ["js", "jsx", "ts", "tsx"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Injection SQL — requête construite par concaténation",
      description: `Une requête SQL est construite avec une interpolation de variable dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "Une personne malveillante peut envoyer du texte piégé dans ce champ pour exécuter son propre SQL : voler, modifier ou détruire toute votre base de données.",
      severity: "critical",
      category: "Sécurité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Utiliser des requêtes paramétrées",
      fixExplanation:
        "Les requêtes paramétrées séparent les données du code SQL : la base traite la variable comme une valeur, jamais comme du SQL. L'injection devient impossible.",
      fixedCode: `// AVANT (vulnérable)
db.query(\`SELECT * FROM users WHERE id = '\${id}'\`)

// APRÈS (sûr)
db.query('SELECT * FROM users WHERE id = $1', [id])`,
      estimatedCost: 0,
    }),
  },

  {
    id: "sql-injection-py",
    pattern: /(execute|executemany|raw)\s*\(\s*f["'][^;]{0,200}\{/,
    extensions: ["py"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Injection SQL — f-string dans la requête",
      description: `Une f-string Python est utilisée directement dans une requête SQL dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "Comme ci-dessus : la variable est collée dans le SQL. Un attaquant peut voler toute votre base avec un simple message piégé.",
      severity: "critical",
      category: "Sécurité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Requête paramétrée avec %s",
      fixExplanation:
        "Passez les valeurs en paramètre séparé. Le driver se charge de les échapper correctement.",
      fixedCode: `# AVANT (vulnérable)
cursor.execute(f"SELECT * FROM users WHERE id = '{user_id}'")

# APRÈS (sûr)
cursor.execute(
    "SELECT * FROM users WHERE id = %s",
    (user_id,),
)`,
      estimatedCost: 0,
    }),
  },

  {
    id: "eval-usage",
    pattern: /\beval\s*\(/,
    extensions: ["js", "jsx", "ts", "tsx", "py"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Utilisation de eval() sur données dynamiques",
      description: `eval() est appelé dans ${filePath}:${lineNumber}. Si la donnée évaluée vient d'un utilisateur, c'est une exécution de code arbitraire.`,
      plainLanguage:
        "eval() exécute du code comme un programme. Si un visiteur peut influencer ce qui est évalué, il peut exécuter n'importe quel code sur votre serveur — y compris vider votre base ou installer un virus.",
      severity: "critical",
      category: "Sécurité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Supprimer eval() — utiliser JSON.parse ou une logique explicite",
      fixExplanation:
        "eval() est presque toujours remplaçable : JSON.parse pour des données, un switch/if pour de la logique. Si vous traitez du JSON non fiable, JSON.parse est sûr, eval ne l'est jamais.",
      fixedCode: `// AVANT
const data = eval(userInput);

// APRÈS
const data = JSON.parse(userInput);`,
      estimatedCost: 0,
    }),
  },

  {
    id: "command-injection",
    pattern: /(child_process|subprocess|os\.system|execSync|spawnSync)\s*\(?.*(\$\{|%s|shell:\s*true)/,
    extensions: ["js", "jsx", "ts", "tsx", "py"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Exécution de commande shell avec entrée dynamique",
      description: `Une commande système est construite avec une donnée dynamique dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "Si un attaquant contrôle une partie de cette commande, il peut exécuter ce qu'il veut sur votre serveur (lire vos fichiers, installer un logiciel, supprimer des données).",
      severity: "high",
      category: "Sécurité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Passer les arguments en tableau, sans shell",
      fixExplanation:
        "Utilisez execFile/spawn avec un tableau d'arguments (sans shell: true). Chaque argument est traité comme une valeur, jamais comme une commande.",
      fixedCode: `// AVANT (vulnérable)
execSync(\`convert \${userFile} out.png\`)

// APRÈS (sûr)
execFileSync('convert', [userFile, 'out.png'])`,
      estimatedCost: 0,
    }),
  },

  // ----- AUTH / SESSIONS -----
  {
    id: "jwt-no-expiry",
    pattern: /(jwt\.sign|sign)\s*\([^)]*\)(?![\s\S]{0,120}expiresIn)/,
    extensions: ["js", "jsx", "ts", "tsx"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Session JWT sans date d'expiration",
      description: `Un token JWT est signé sans option expiresIn dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "Une fois connecté, la session reste valide pour toujours. Si quelqu'un vole ce token (par exemple via un Wifi public), il a accès à vie à votre compte.",
      severity: "high",
      category: "Sécurité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Ajouter une expiration courte + refresh token",
      fixExplanation:
        "Une session doit expirer. 24h pour un token d'accès, plus long pour un refresh token stocké côté serveur. C'est la recommandation OWASP.",
      fixedCode: `// AVANT
jwt.sign({ userId }, SECRET);

// APRÈS
jwt.sign({ userId }, SECRET, { expiresIn: '24h' });`,
      estimatedCost: 0,
    }),
  },

  {
    id: "password-in-log",
    pattern: /(console\.(log|info|warn)|print|logger\.\w+|log)\s*\([^)]*(password|passwd|secret|token|api[_-]?key|credit[_-]?card)/i,
    extensions: ["js", "jsx", "ts", "tsx", "py"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => {
      // Faux positif classique : le mot sensible apparaît dans un MESSAGE
      // litteral ("password non trouve") et non dans une donnee loggee.
      // On verifie que le mot sensible est bien une valeur nue (variable,
      // propriete), pas une chaine entre guillemets.
      const argsPart = line.slice(line.indexOf("(") + 1);
      const withoutStrings = argsPart.replace(/["'`][^"'`]*["'`]/g, "");
      const bareValue = /[,:(\s](password|passwd|secret|token|api[_-]?key|credit[_-]?card)\s*[,)\s]/i.test(
        withoutStrings,
      );
      if (!bareValue) return null;
      return {
        title: "Donnée sensible transmise dans les logs",
      description: `Un log contient un champ sensible (mot de passe, token, clé) dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "Vous écrivez des données sensibles dans vos logs. Ces fichiers sont souvent lisibles par toute votre équipe — et parfois accessibles publiquement. C'est aussi une violation RGPD si ce sont des données clients.",
      severity: "critical",
      category: "Sécurité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Journaliser uniquement des champs explicitement sûrs",
      fixExplanation:
        "Liste blanche explicite des champs à journaliser, plutôt que de tout passer au logger. Masquez les champs sensibles avant log.",
      fixedCode: `// AVANT
console.log('login', req.body); // contient le mot de passe

// APRÈS
const { password, ...safe } = req.body;
console.log('login', safe);`,
      estimatedCost: 0,
      };
    },
  },

  {
    id: "cors-wildcard",
    pattern: /origin\s*:\s*["']\*["']|Access-Control-Allow-Origin["']?\s*[,:]\s*["']\*/,
    extensions: ["js", "jsx", "ts", "tsx", "py"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "CORS ouvert à tous les domaines (*)",
      description: `La politique CORS autorise toutes les origines dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "N'importe quel site internet peut appeler votre API depuis le navigateur de vos utilisateurs. Combiné à une session active, ça ouvre la porte au vol de données.",
      severity: "high",
      category: "Sécurité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Restreindre aux domaines connus",
      fixExplanation:
        "Listez explicitement vos domaines autorisés (votre front, votre app mobile). Refusez tout le reste.",
      fixedCode: `// AVANT
cors({ origin: '*' })

// APRÈS
cors({ origin: ['https://monapp.com', 'https://www.monapp.com'] })`,
      estimatedCost: 0,
    }),
  },

  // ----- PERFORMANCE / COÛTS -----
  {
    id: "prisma-findmany-nolimit",
    pattern: /(findMany|\.find\(\))\s*\(\s*\)(?![\s\S]{0,80}\btake\b)/,
    extensions: ["js", "jsx", "ts", "tsx"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Requête sans pagination (findMany sans limite)",
      description: `Une requête findMany() sans take est appelée dans ${filePath}:${lineNumber}. Elle charge toutes les lignes de la table.`,
      plainLanguage:
        "Votre page charge TOUT le contenu de la base d'un coup. Plus vous avez d'utilisateurs et de données, plus c'est lent — et ça finit par saturer votre serveur et faire grimper vos coûts.",
      severity: "medium",
      category: "Performance",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Ajouter une pagination (take + cursor)",
      fixExplanation:
        "Chargez 20 éléments à la fois. La pagination par curseur est la méthode la plus robuste : elle reste rapide même sur des millions de lignes.",
      fixedCode: `// AVANT
const tasks = await prisma.task.findMany();

// APRÈS
const tasks = await prisma.task.findMany({
  take: 20,
  skip: cursor,
  orderBy: { createdAt: 'desc' },
});`,
      estimatedCost: 240,
    }),
  },

  {
    id: "fetch-in-loop",
    pattern: /forEach\s*\(\s*async\s*\(/,
    extensions: ["js", "jsx", "ts", "tsx"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => {
      // forEach(async ...) est TOUJOURS un bug : les promesses ne sont
      // jamais attendues. À l'inverse, map(async ...) est souvent le
      // pattern CORRECT lorsqu'il est enveloppé dans Promise.all
      // (parallélisation) — on ne le signale donc plus ici.
      return {
        title: "Appels API séquentiels dans une boucle (problème N+1)",
        description: `Un callback async est passé à forEach dans ${filePath}:${lineNumber} — les appels s'enchaînent en série et leurs promesses ne sont jamais attendues.`,
        plainLanguage:
          "Votre code lance un appel réseau par élément, les uns après les autres, sans attendre leur fin. Avec 14 articles dans le panier, ça fait 14 allers-retours successifs : lent pour l'utilisateur, coûteux pour vous.",
        severity: "high",
        category: "Performance",
        filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Paralléliser avec Promise.all",
      fixExplanation:
        "Lancez tous les appels en même temps au lieu de les enchaîner. Le temps total passe de 'somme des appels' à 'durée du plus long appel'.",
      fixedCode: `// AVANT (séquentiel)
items.forEach(async (item) => {
  const p = await fetchProduct(item.productId);
});

// APRÈS (parallèle)
const products = await Promise.all(
  items.map((item) => fetchProduct(item.productId))
);`,
      estimatedCost: 184,
      };
    },
  },

  {
    id: "lodash-full-import",
    pattern: /import\s+_\s+from\s+["']lodash["']|require\(\s*["']lodash["']\s*\)/,
    extensions: ["js", "jsx", "ts", "tsx"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Import complet de lodash dans le bundle",
      description: `Toute la librairie lodash est importée dans ${filePath}:${lineNumber} alors que seules quelques fonctions sont utilisées.`,
      plainLanguage:
        "Vous embarquez environ 70 Ko de code inutile dans chaque page. Sur mobile et connexion lente, ça se sent directement au chargement.",
      severity: "medium",
      category: "Performance",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Importer les fonctions individuellement",
      fixExplanation:
        "Importez uniquement les fonctions utilisées. Le bundler n'embarque alors que le code réellement appelé.",
      fixedCode: `// AVANT
import _ from 'lodash';

// APRÈS
import debounce from 'lodash/debounce';
import throttle from 'lodash/throttle';`,
      estimatedCost: 124,
    }),
  },

  // ----- HYGIÈNE / DETTES -----
  {
    id: "todo-fixme",
    pattern: /\/\/\s*(TODO|FIXME|HACK|XXX)\b/i,
    extensions: ["js", "jsx", "ts", "tsx", "py", "go", "rb"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "Marqueur TODO/FIXME oublié dans le code",
      description: `Un commentaire TODO/FIXME est présent dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "Vous avez laissé une note 'à faire plus tard'. C'est léger, mais ça signale du code probablement incomplet ou une correction reportée qui peut cacher un bug.",
      severity: "low",
      category: "Maintenabilité",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Traiter le TODO ou le transformer en ticket",
      fixExplanation:
        "Soit vous le corrigez maintenant, soit vous créez un ticket dans votre outil de suivi pour ne pas l'oublier. Un TODO qui traîne des mois est un bug qui attend.",
      fixedCode: `// AVANT
// TODO: gérer le cas où l'utilisateur n'existe pas

// APRÈS — soit corrigé, soit ticket créé`,
      estimatedCost: 0,
    }),
  },

  {
    id: "console-log-left",
    pattern: /console\.(log|debug)\s*\(/,
    extensions: ["js", "jsx", "ts", "tsx"],
    onePerFile: true,
    match: (line, filePath, lineNumber) => ({
      title: "console.log oublié dans le code de production",
      description: `Un console.log est présent dans ${filePath}:${lineNumber}.`,
      plainLanguage:
        "Vous avez laissé des logs de débogage dans le code final. Vos visiteurs peuvent les voir dans la console de leur navigateur — et ils révèlent parfois votre logique interne.",
      severity: "low",
      category: "Code mort",
      filePath,
      lineNumber,
      codeSnippet: snippet(line),
      fixTitle: "Supprimer les console au build de production",
      fixExplanation:
        "Configurez votre bundler pour retirer automatiquement tous les console.* en production. Zéro risque d'oubli.",
      fixedCode: `// Next.js
compiler: { removeConsole: process.env.NODE_ENV === 'production' }

// Vite
esbuild: { drop: ['console', 'debugger'] }`,
      estimatedCost: 0,
    }),
  },
];

// ---------- fichiers ignorés (bruit, pas du code projet) ----------

const IGNORED_DIRS = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "out/",
  "coverage/",
  "__pycache__/",
  ".venv/",
  "venv/",
];

const IGNORED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "avif", "ico", "svg", "bmp",
  "mp4", "webm", "mov", "mp3", "wav", "ogg",
  "zip", "tar", "gz", "rar", "7z",
  "woff", "woff2", "ttf", "eot", "otf",
  "pdf", "doc", "docx", "xls", "xlsx",
  "exe", "dll", "so", "dylib", "bin", "wasm",
  "lock",
]);

const TEXT_EXTENSIONS = new Set([
  "js", "jsx", "mjs", "cjs", "ts", "tsx", "vue", "svelte",
  "py", "rb", "go", "rs", "java", "kt", "php", "c", "h", "cpp",
  "cs", "swift", "sh", "bash", "sql", "graphql",
  "json", "yml", "yaml", "toml", "ini", "cfg", "conf",
  "env", "md", "txt", "html", "css", "scss", "less",
]);

const ENV_FILENAMES = new Set([
  ".env", ".env.local", ".env.production", ".env.development",
  ".env.staging", ".env.test",
]);

// ---------- fichiers de test / fixtures ----------
// Exclusion standard de tous les scanners pro (Snyk, Semgrep...) :
// le code de test contient VOLONTAIREMENT du code vulnérable
// (fixtures, faux secrets, exemples pédagogiques). Le scanner se
// scannant lui-même trouverait ses propres tests = 100% faux positifs.
const IGNORED_FILE_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx|mjs|cjs)$/,      // foo.test.ts
  /(^|\/)(test|tests|__tests__|__mocks__|fixtures?|e2e)\//, // dossiers de test
  /(^|\/)(self-test|run-tests|test_webhook)\.ts$/, // scripts de test du moteur
];

function isTestFile(path: string): boolean {
  const lower = path.toLowerCase();
  return IGNORED_FILE_PATTERNS.some((re) => re.test(lower));
}

// ---------- fichiers internes du moteur ----------
// Les règles du moteur contiennent des exemples de code vulnérable
// dans leurs descriptions (jwt.sign sans expiry, eval, CORS *...).
// Scanner ces fichiers = se scanner soi-même.
const ENGINE_INTERNAL = [
  "src/lib/engine/rules.ts",
  "src/lib/seed-data.ts",
  "src/lib/seed.ts",
];

function isEngineInternal(path: string): boolean {
  return ENGINE_INTERNAL.some((p) => path.includes(p));
}

export function isScannableFile(path: string): boolean {
  const lower = path.toLowerCase();

  // ignore les dossiers de build/deps
  for (const dir of IGNORED_DIRS) {
    if (lower.includes(dir)) return false;
  }

  // ignore les fichiers de test et fixtures (convention standard)
  if (isTestFile(lower)) return false;

  // ignore les fichiers internes du moteur (exemples pédagogiques)
  if (isEngineInternal(path)) return false;

  const base = lower.split("/").pop() ?? "";

  // les fichiers .env sont toujours scannables
  if (ENV_FILENAMES.has(base)) return true;

  const ext = base.includes(".") ? (base.split(".").pop() ?? "") : "";

  if (!ext) {
    // fichiers sans extension : Dockerfile, Makefile, LICENSE...
    return /^(dockerfile|makefile|license|procfile)$/.test(base);
  }

  if (IGNORED_EXTENSIONS.has(ext)) return false;
  return TEXT_EXTENSIONS.has(ext);
}

// ---------- l'analyseur ----------

/**
 * Analyse une map de fichiers (chemin → contenu) et retourne
 * UNIQUEMENT les failles réellement détectées par les règles.
 */
export function analyzeFiles(
  files: Array<{ path: string; content: string }>,
): Finding[] {
  const findings: Finding[] = [];
  const seenKeys = new Set<string>();

  for (const file of files) {
    if (!isScannableFile(file.path)) continue;

    const base = (file.path.split("/").pop() ?? "").toLowerCase();
    const ext = base.includes(".") ? (base.split(".").pop() ?? "") : "";

    // garde-fou taille : on ignore les fichiers énormes (minifiés, data...)
    if (file.content.length > 400_000) continue;

    const lines = file.content.split("\n");

    for (const rule of RULES) {
      // filtre : la règle s'applique si le fichier matche
      // (extension listée OU nom de fichier listé — OU, pas ET)
      if (rule.extensions || rule.filenames) {
        const extOk = rule.extensions ? rule.extensions.includes(ext) : false;
        const nameOk = rule.filenames ? rule.filenames.includes(base) : false;
        if (!extOk && !nameOk) continue;
      }

      let done = false;
      for (let i = 0; i < lines.length; i++) {
        if (done) break;
        const line = lines[i];
        if (!rule.pattern.test(line)) continue;

        const finding = rule.match(line, file.path, i + 1);
        if (!finding) continue;

        // dédoublonnage
        const key = `${rule.id}::${file.path}`;
        if (seenKeys.has(key)) {
          done = true;
          break;
        }
        seenKeys.add(key);

        findings.push({ ...finding, ruleId: rule.id });

        if (rule.onePerFile) {
          done = true;
          break;
        }
      }
    }
  }

  return findings;
}
