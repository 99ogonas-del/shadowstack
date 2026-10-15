export type SeedFinding = {
  title: string;
  description: string;
  plainLanguage: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  fixTitle: string;
  fixExplanation: string;
  fixedCode: string;
  estimatedCost?: number;
};

export type SeedScan = {
  type: "security" | "cleanup" | "full" | "costs";
  status: "queued" | "running" | "completed" | "failed";
  progress: number;
  createdAt: string; // ISO
  completedAt?: string;
  durationMs?: number;
  findings: SeedFinding[];
};

export type SeedProject = {
  name: string;
  description: string;
  source: "github" | "zip" | "manual";
  sourceUrl?: string;
  language: string;
  framework: string;
  healthScore: number;
  createdAt: string;
  scans: SeedScan[];
};

export const SEED_PROJECTS: SeedProject[] = [
  {
    name: "elegancebystella",
    description: "Site e-commerce Next.js pour une boutique de robes de soirée.",
    source: "github",
    sourceUrl: "https://github.com/ogdiverse/elegancebystella",
    language: "TypeScript",
    framework: "Next.js 16",
    healthScore: 85,
    createdAt: "2026-09-22T14:32:00Z",
    scans: [
      {
        type: "full",
        status: "completed",
        progress: 100,
        durationMs: 47200,
        createdAt: "2026-09-28T14:32:00Z",
        completedAt: "2026-09-28T14:32:47Z",
        findings: [
          {
            title: "Clé API Stripe exposée dans le code source",
            description:
              "Une clé secrète Stripe live a été trouvée en clair dans .env.local commitée au dépôt.",
            plainLanguage:
              "Votre clé de paiement Stripe est visible par tous sur GitHub. N'importe qui peut facturer vos clients ou vider votre compte.",
            severity: "critical",
            category: "Secrets",
            filePath: ".env.local",
            lineNumber: 4,
            codeSnippet:
              "STRIPE_SECRET_KEY=XXXX_REDACTED_EXAMPLE",
            fixTitle: "Déplacer la clé vers un secret serveur",
            fixExplanation:
              "Les clés secrètes doivent uniquement vivre dans des variables d'environnement côté serveur, jamais commitées ni embarquées dans le bundle. Ajoutez la clé dans votre dashboard Vercel/Render, puis remplacez par process.env.STRIPE_SECRET_KEY.",
            fixedCode:
              "\/\/ Dans .env.local (jamais commité)\\nSTRIPE_SECRET_KEY=XXXX_REDACTED_EXAMPLE\\n\\n\/\/ Dans src\/lib\/stripe.ts\\nimport Stripe from 'stripe';\\nconst stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {\\n  apiVersion: '2024-06-20',\\n});",
            estimatedCost: 0,
          },
          {
            title: "Requête N+1 dans la page panier",
            description:
              "Un appel API supplémentaire est effectué pour chaque ligne du panier (avg 14 items).",
            plainLanguage:
              "À chaque article ajouté au panier, votre code refait une requête. Plus vos clients ont d'articles, plus c'est lent et coûteux.",
            severity: "high",
            category: "Performance",
            filePath: "src/app/cart/page.tsx",
            lineNumber: 87,
            codeSnippet:
              "items.map(async (item) => {\n  const product = await fetchProduct(item.productId);\n  return <CartRow product={product} />;\n})",
            fixTitle: "Précharger les produits en parallèle",
            fixExplanation:
              "Au lieu de fetcher chaque produit un par un, utilisez Promise.all pour les récupérer en parallèle en une seule passe. Réduit jusqu'à 92% du temps de chargement.",
            fixedCode:
              "const products = await Promise.all(\n  items.map((item) => fetchProduct(item.productId))\n);\nreturn items.map((item, i) => (\n  <CartRow key={item.id} product={products[i]} />\n));",
            estimatedCost: 184,
          },
          {
            title: "Dépendance lodash@4.17.20 obsolète",
            description:
              "Lodash 4.17.20 contient une vulnérabilité connue (prototype pollution, CVE-2021-23337).",
            plainLanguage:
              "Lodash a été mis à jour il y a longtemps avec des corrections de sécurité importantes. Vous utilisez une version qui fuit.",
            severity: "high",
            category: "Dépendances",
            filePath: "package.json",
            lineNumber: 23,
            codeSnippet: '"lodash": "^4.17.20"',
            fixTitle: "Mettre à jour vers lodash 4.17.21",
            fixExplanation:
              "Une simple mise à jour corrige la vulnérabilité. Compatible à 100% avec votre code actuel.",
            fixedCode: '"lodash": "^4.17.21"',
            estimatedCost: 0,
          },
          {
            title: "Images non compressées (>500KB chacune)",
            description:
              "8 images de produits dépassent 500KB et ralentissent le LCP mobile.",
            plainLanguage:
              "Vos images sont trop lourdes. Le site met longtemps à s'afficher sur téléphone et Google vous pénalise.",
            severity: "medium",
            category: "Performance",
            filePath: "public/images/products/",
            lineNumber: 0,
            codeSnippet: "robe-1.jpg (1.2MB)",
            fixTitle: "Convertir en WebP/AVIF et redimensionner",
            fixExplanation:
              "Conversion automatique en .webp à 80% de qualité. Gain moyen de 78% en poids sans perte visible.",
            fixedCode: "next/image avec formats: ['image/avif', 'image/webp']\n// Tailwind: aspect-square object-cover",
            estimatedCost: 96,
          },
          {
            title: "Logique métier dupliquée dans 3 composants",
            description:
              "Le calcul de TVA est copié-collé entre Cart, Checkout et Invoices.",
            plainLanguage:
              "Vous avez la même règle de calcul recopiée à 3 endroits. Si la TVA change, vous risquez d'oublier un fichier.",
            severity: "low",
            category: "Maintenabilité",
            filePath: "src/lib/pricing.ts",
            lineNumber: 12,
            codeSnippet:
              "function calcVat(amount) { return amount * 0.2 } // copié 3 fois",
            fixTitle: "Extraire dans src/lib/pricing.ts",
            fixExplanation:
              "Une seule fonction exportée et importée là où c'est nécessaire.",
            fixedCode:
              "// src/lib/pricing.ts\nexport function calcVat(amount: number, rate = 0.2) {\n  return amount * rate;\n}",
            estimatedCost: 0,
          },
        ],
      },
    ],
  },
  {
    name: "telegram-agent",
    description: "Bot Telegram IA qui répond aux questions clients en plusieurs langues.",
    source: "zip",
    language: "Python",
    framework: "FastAPI",
    healthScore: 62,
    createdAt: "2026-09-19T16:20:00Z",
    scans: [
      {
        type: "security",
        status: "completed",
        progress: 100,
        durationMs: 31800,
        createdAt: "2026-09-27T09:15:00Z",
        completedAt: "2026-09-27T09:15:31Z",
        findings: [
          {
            title: "Injection SQL dans /api/query",
            description:
              "Paramètre user_id concaténé directement dans la requête SQL.",
            plainLanguage:
              "Quelqu'un pourrait envoyer un message piégé à votre bot pour voler toute votre base de données.",
            severity: "critical",
            category: "Sécurité",
            filePath: "app/api/query.py",
            lineNumber: 28,
            codeSnippet:
              "cursor.execute(f\"SELECT * FROM users WHERE id = '{user_id}'\")",
            fixTitle: "Utiliser des requêtes paramétrées",
            fixExplanation:
              "Les requêtes paramétrées séparent les données du code SQL, rendant l'injection impossible.",
            fixedCode:
              "cursor.execute(\n    \"SELECT * FROM users WHERE id = %s\",\n    (user_id,)\n)",
            estimatedCost: 0,
          },
          {
            title: "Pas de rate limiting sur l'endpoint /webhook",
            description:
              "L'endpoint accepte des milliers de requêtes par seconde.",
            plainLanguage:
              "Votre bot peut être submergé de requêtes et tomber en panne (ou faire exploser votre facture OpenAI).",
            severity: "high",
            category: "Sécurité",
            filePath: "app/main.py",
            lineNumber: 47,
            codeSnippet: "@app.post('/webhook')\nasync def webhook(): ...",
            fixTitle: "Ajouter slowapi (rate limiter)",
            fixExplanation:
              "Limite de 30 requêtes/minute par utilisateur Telegram.",
            fixedCode:
              "from slowapi import Limiter\nlimiter = Limiter(key_func=get_telegram_id)\n\n@app.post('/webhook')\n@limiter.limit('30/minute')\nasync def webhook(): ...",
            estimatedCost: 0,
          },
          {
            title: "Boucle qui recharge tout le contexte à chaque message",
            description:
              "À chaque message, l'IA recharge l'historique complet au lieu d'utiliser un résumé.",
            plainLanguage:
              "Chaque message envoyé à votre bot coûte 3 fois plus cher qu'il ne devrait car vous renvoyez tout l'historique.",
            severity: "high",
            category: "Coûts IA",
            filePath: "app/agent.py",
            lineNumber: 64,
            codeSnippet:
              "messages = load_full_history(chat_id)\nresponse = openai.chat(messages)",
            fixTitle: "Utiliser une fenêtre glissante + résumé",
            fixExplanation:
              "Ne garder que les 5 derniers messages + un résumé de l'historique plus ancien.",
            fixedCode:
              "history = load_summary(chat_id) + load_last_n(chat_id, n=5)\nresponse = openai.chat(history)",
            estimatedCost: 412,
          },
          {
            title: "requests 2.25.0 a une vulnérabilité (CVE-2023-32681)",
            description: "Mise à jour de sécurité disponible.",
            plainLanguage: "Votre librairie HTTP a une faille connue et corrigée.",
            severity: "medium",
            category: "Dépendances",
            filePath: "requirements.txt",
            lineNumber: 8,
            codeSnippet: "requests==2.25.0",
            fixTitle: "Mettre à jour vers 2.32.3",
            fixExplanation: "Patch de sécurité sans changement d'API.",
            fixedCode: "requests==2.32.3",
            estimatedCost: 0,
          },
        ],
      },
    ],
  },
  {
    name: "portfolio",
    description: "Portfolio personnel React / Vite avec animations Framer Motion.",
    source: "zip",
    language: "JavaScript",
    framework: "React / Vite",
    healthScore: 92,
    createdAt: "2026-09-17T15:05:00Z",
    scans: [
      {
        type: "cleanup",
        status: "completed",
        progress: 100,
        durationMs: 28900,
        createdAt: "2026-09-26T18:40:00Z",
        completedAt: "2026-09-26T18:40:28Z",
        findings: [
          {
            title: "12 imports inutilisés détectés",
            description: "Imports présents mais jamais référencés dans le code.",
            plainLanguage:
              "Vous importez 12 librairies que vous n'utilisez jamais. Ça alourdit votre bundle.",
            severity: "low",
            category: "Code mort",
            filePath: "src/components/Hero.jsx",
            lineNumber: 3,
            codeSnippet:
              "import { motion, useInView, useScroll } from 'framer-motion'",
            fixTitle: "Supprimer les imports inutilisés",
            fixExplanation:
              "Le linter ESLint avec la règle no-unused-vars les retirera automatiquement.",
            fixedCode: "// Conservé uniquement 'motion' qui est utilisé",
            estimatedCost: 0,
          },
          {
            title: "Console.log oubliés en production",
            description: "8 instructions console.log restantes.",
            plainLanguage:
              "Vous avez oublié des console.log dans le code final. Visiteurs et hackers peuvent voir votre logique interne.",
            severity: "low",
            category: "Code mort",
            filePath: "src/utils/api.js",
            lineNumber: 22,
            codeSnippet: "console.log('debug', response)",
            fixTitle: "Activer l'élimination automatique au build",
            fixExplanation: "Vite supprime les console.* en mode production par défaut.",
            fixedCode:
              "// vite.config.js\nesbuild: { drop: ['console', 'debugger'] }",
            estimatedCost: 0,
          },
        ],
      },
    ],
  },
  {
    name: "taskr-flow",
    description: "App SaaS de gestion de tâches en équipe (Slack, Notion, Linear).",
    source: "github",
    sourceUrl: "https://github.com/aurora-dev/taskr-flow",
    language: "TypeScript",
    framework: "Next.js 16 / Prisma",
    healthScore: 58,
    createdAt: "2026-09-10T11:15:00Z",
    scans: [
      {
        type: "full",
        status: "completed",
        progress: 100,
        durationMs: 65300,
        createdAt: "2026-09-25T10:20:00Z",
        completedAt: "2026-09-25T10:21:05Z",
        findings: [
          {
            title: "17 dépendances obsolètes",
            description: "Versions majeures en retard (Prisma, NextAuth, Zod...).",
            plainLanguage:
              "Vous utilisez des versions anciennes de vos principaux outils. Beaucoup de nouvelles optimisations et de correctifs vous manquent.",
            severity: "medium",
            category: "Dépendances",
            filePath: "package.json",
            lineNumber: 1,
            codeSnippet: '"@prisma/client": "5.4.0"',
            fixTitle: "Migration progressive guidée",
            fixExplanation:
              "Liste triée par compatibilité avec votre code actuel. Migration en 4 étapes testées.",
            fixedCode:
              "npm install @prisma/client@latest\nnpx prisma migrate dev",
            estimatedCost: 0,
          },
          {
            title: "Authentification sans expiration sur les sessions",
            description: "Les JWT ont une durée de vie illimitée.",
            plainLanguage:
              "Une fois connecté, votre session reste valide pour toujours. Si quelqu'un vole le token, il a accès à vie.",
            severity: "high",
            category: "Sécurité",
            filePath: "src/lib/auth.ts",
            lineNumber: 14,
            codeSnippet: "jwt.sign({ userId }, SECRET); // pas d'expiration",
            fixTitle: "Ajouter expiration 24h + refresh token",
            fixExplanation: "Bonne pratique OWASP pour applications SaaS.",
            fixedCode:
              "jwt.sign({ userId }, SECRET, { expiresIn: '24h' });",
            estimatedCost: 0,
          },
          {
            title: "Requête findMany() sans pagination sur la home",
            description: "Charge toutes les tâches de tous les utilisateurs.",
            plainLanguage:
              "Votre page d'accueil charge TOUTES les tâches. Plus vous avez d'utilisateurs, plus c'est lent.",
            severity: "medium",
            category: "Performance",
            filePath: "src/app/dashboard/page.tsx",
            lineNumber: 32,
            codeSnippet:
              "const tasks = await prisma.task.findMany();",
            fixTitle: "Ajouter pagination cursor-based",
            fixExplanation: "Charge 20 tâches à la fois.",
            fixedCode:
              "const tasks = await prisma.task.findMany({\n  take: 20,\n  skip: cursor,\n  orderBy: { createdAt: 'desc' },\n});",
            estimatedCost: 240,
          },
          {
            title: "Variable 'password' en clair transmise dans les logs",
            description: "Logger.log(req.body) avant sanitisation.",
            plainLanguage:
              "Vous envoyez le mot de passe de vos utilisateurs dans vos logs. RGPD catastrophe.",
            severity: "critical",
            category: "Sécurité",
            filePath: "src/app/api/auth/login/route.ts",
            lineNumber: 21,
            codeSnippet: "console.log('login', req.body);",
            fixTitle: "Logger uniquement les champs safe",
            fixExplanation: "Whitelist explicite des champs à journaliser.",
            fixedCode:
              "const { password, ...safe } = req.body;\nconsole.log('login', safe);",
            estimatedCost: 0,
          },
          {
            title: "Framer Motion chargé sur toutes les pages",
            description: "Bundle 142kB sur la page /pricing qui n'a pas d'animation.",
            plainLanguage:
              "Toutes vos pages paient le prix de la librairie d'animation, même celles qui ne bougent pas.",
            severity: "medium",
            category: "Performance",
            filePath: "src/app/layout.tsx",
            lineNumber: 8,
            codeSnippet: "import { MotionConfig } from 'framer-motion';",
            fixTitle: "Lazy loading par route",
            fixExplanation:
              "Charger Framer Motion uniquement dans les composants qui en ont besoin via next/dynamic.",
            fixedCode:
              "const Hero = dynamic(() => import('@/components/Hero'), {\n  ssr: false,\n});",
            estimatedCost: 168,
          },
          {
            title: "5 fichiers secrets (.env.*) trackés",
            description: "Historique git contient .env.local",
            plainLanguage:
              "Vos fichiers de configuration secrète sont dans l'historique Git. Même en les supprimant aujourd'hui, ils restent accessibles.",
            severity: "critical",
            category: "Secrets",
            filePath: ".env.local",
            lineNumber: 0,
            codeSnippet: "DATABASE_URL=postgres://...",
            fixTitle: "Purger l'historique + régénérer les secrets",
            fixExplanation:
              "Utiliser git filter-repo puis bfg, puis régénérer TOUTES les clés API impactées.",
            fixedCode:
              "git filter-repo --invert-paths --path .env.local\n# Puis rotation des clés Stripe, DB, etc.",
            estimatedCost: 0,
          },
        ],
      },
    ],
  },
];
