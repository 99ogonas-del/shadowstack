/**
 * ShadowStack — Auto-tests du moteur d'analyse
 *
 * Chaque cas contient du code VULNÉRABLE connu et la règle qui DOIT
 * se déclencher. On exécute le vrai moteur (analyzeManualCode) dessus
 * et on vérifie que la faille est détectée — et qu'un code PROPRE
 * ne déclenche rien (test négatif).
 *
 * Lancé par : npm test  (et affiché dans la page /tests)
 */

import { analyzeManualCode } from "./analyze";

type TestCase = {
  id: string;
  rule: string; // id de règle attendue
  filename: string;
  code: string;
};

// ---------- Cas positifs : la faille DOIT être détectée ----------
const positiveCases: TestCase[] = [
  {
    id: "secret-stripe",
    rule: "secret-known-provider",
    filename: "config.ts",
    code: `const key = "sk_live_FAKEFAKEFAKEFAKEFAKE1";`,
  },
  {
    id: "secret-generic",
    rule: "secret-generic-assignment",
    filename: "db.ts",
    code: `const password = "monSuperMotDePasse123";`,
  },
  {
    id: "sql-injection",
    rule: "sql-injection-js",
    filename: "query.ts",
    code: `const q = query(\`SELECT * FROM users WHERE id = \${userId}\`);`,
  },
  {
    id: "sql-injection-py",
    rule: "sql-injection-py",
    filename: "db.py",
    code: `cur.execute(f"SELECT * FROM users WHERE id = {user_id}")`,
  },
  {
    id: "eval",
    rule: "eval-usage",
    filename: "calc.ts",
    code: `const result = eval(userInput);`,
  },
  {
    id: "command-injection",
    rule: "command-injection",
    filename: "run.ts",
    code: `execSync(\`ls \${userDir}\`);`,
  },
  {
    id: "jwt-no-expiry",
    rule: "jwt-no-expiry",
    filename: "auth.ts",
    code: `const token = jwt.sign(payload, secret);`,
  },
  {
    id: "password-in-log",
    rule: "password-in-log",
    filename: "login.ts",
    code: `console.log("mot de passe:", password);`,
  },
  {
    id: "cors-wildcard",
    rule: "cors-wildcard",
    filename: "server.ts",
    code: `app.use(cors({ origin: "*" }));`,
  },
  {
    id: "prisma-nolimit",
    rule: "prisma-findmany-nolimit",
    filename: "model.ts",
    code: `const users = await prisma.user.findMany();`,
  },
  {
    id: "drizzle-nolimit",
    rule: "drizzle-select-no-limit",
    filename: "query.ts",
    code: `const users = await db.select().from(usersTable);`,
  },
  {
    id: "fetch-in-loop",
    rule: "fetch-in-loop",
    filename: "sync.ts",
    code: `ids.forEach(async (id) => { await fetch("/api/user/" + id); });`,
  },
  {
    id: "lodash-full",
    rule: "lodash-full-import",
    filename: "utils.ts",
    code: `import _ from "lodash";`,
  },
  {
    id: "todo-fixme",
    rule: "todo-fixme",
    filename: "wip.ts",
    code: `// TODO: finir la validation ici`,
  },
  {
    id: "console-log",
    rule: "console-log-left",
    filename: "debug.ts",
    code: `console.log("valeur de debug", x);`,
  },
];

// ---------- Cas négatifs : code PROPRE → 0 finding ----------
const negativeCases: TestCase[] = [
  {
    id: "clean-code",
    rule: "(aucune)",
    filename: "clean.ts",
    code: `export function add(a: number, b: number): number {\n  return a + b;\n}`,
  },
  {
    id: "parameterized-query",
    rule: "(aucune)",
    filename: "safe-query.ts",
    code: `const rows = await prisma.user.findMany({ take: 50 });`,
  },
  {
    id: "env-read",
    rule: "(aucune)",
    filename: "safe-config.ts",
    code: `const key = process.env.MA_CLE_SECRETE;`,
  },
  {
    id: "jwt-with-expiry",
    rule: "(aucune)",
    filename: "safe-auth.ts",
    code: `const token = jwt.sign(payload, secret, { expiresIn: "24h" });`,
  },
  {
    id: "jwt-keyword-fp",
    rule: "(aucune)",
    filename: "roles.ts",
    code: `assignRole(user, "admin"); const s = signature(x);`,
  },
  {
    id: "drizzle-with-limit",
    rule: "(aucune)",
    filename: "safe-query.ts",
    code: `const users = await db.select().from(usersTable).limit(20);`,
  },
];

export type TestResult = {
  id: string;
  rule: string;
  kind: "positif" | "négatif";
  passed: boolean;
  detail: string;
  findingsCount: number;
};

export type TestReport = {
  passed: number;
  failed: number;
  total: number;
  results: TestResult[];
  durationMs: number;
};

/** Exécute toute la suite et retourne le rapport. */
export function runEngineTests(): TestReport {
  const start = Date.now();
  const results: TestResult[] = [];

  for (const tc of positiveCases) {
    try {
      const { findings } = analyzeManualCode(tc.code, tc.filename);
      const hit = findings.some((f) => f.ruleId === tc.rule);
      results.push({
        id: tc.id,
        rule: tc.rule,
        kind: "positif",
        passed: hit,
        detail: hit
          ? `Faille détectée (${findings.length} finding(s))`
          : `ÉCHEC — règle "${tc.rule}" non déclenchée (${findings.length} finding(s) trouvé(s))`,
        findingsCount: findings.length,
      });
    } catch (e) {
      results.push({
        id: tc.id,
        rule: tc.rule,
        kind: "positif",
        passed: false,
        detail: `Erreur moteur : ${(e as Error).message}`,
        findingsCount: 0,
      });
    }
  }

  for (const tc of negativeCases) {
    try {
      const { findings } = analyzeManualCode(tc.code, tc.filename);
      const clean = findings.length === 0;
      results.push({
        id: tc.id,
        rule: tc.rule,
        kind: "négatif",
        passed: clean,
        detail: clean
          ? "Code propre, 0 finding (correct)"
          : `ÉCHEC — faux positif : ${findings.length} finding(s) sur du code sain`,
        findingsCount: findings.length,
      });
    } catch (e) {
      results.push({
        id: tc.id,
        rule: tc.rule,
        kind: "négatif",
        passed: false,
        detail: `Erreur moteur : ${(e as Error).message}`,
        findingsCount: 0,
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  return {
    passed,
    failed: results.length - passed,
    total: results.length,
    results,
    durationMs: Date.now() - start,
  };
}
