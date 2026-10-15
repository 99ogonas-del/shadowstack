<div align="center">

# 🛡️ ShadowStack

### Ton gardien de code propulsé par l'IA

**Analyse de sécurité automatisée pour le "vibe coding"** — détecte les failles réelles dans ton code, explique-les en français simple, et te guide pour les corriger.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org)

</div>

---

## 🎯 Le problème

Le *vibe coding* (coder avec l'IA) est puissant — et dangereux. L'IA génère du code vite, mais laisse souvent traîner :

- 🔑 Des clés d'API en dur (`sk_live_...`, clés AWS)
- 💉 Des injections SQL (requêtes construites par concaténation)
- ⚡ Des `eval()` sur des données utilisateur
- 🌐 Des CORS ouverts à tous les domaines
- 📦 Des dépendances obsolètes avec des failles connues (CVE)

Tu ne le sais pas — jusqu'au jour où quelqu'un exploite la faille.

## ✨ La solution

**ShadowStack** analyse ton projet (ZIP, fichier, ou dépôt GitHub) et te donne :

| | |
|---|---|
| 🔍 **Détection réelle** | 14+ règles de sécurité + scan des dépendances (npm/PyPI) |
| 🗣️ **Explication en clair** | Chaque faille expliquée sans jargon, avec le risque concret |
| 🔧 **Guide de correction** | Le code corrigé, prêt à copier, + le "pourquoi" |
| 📊 **Score de santé** | Une note sur 100, par projet, qui remonte quand tu corriges |
| 🔐 **Sécurité du compte** | 2FA (TOTP), vérification email, rate limiting, journal d'audit |

## 🚀 Démarrage rapide

```bash
# 1. Cloner
git clone https://github.com/TON-USER/shadowstack.git
cd shadowstack

# 2. Installer
npm install

# 3. Base de données (PostgreSQL)
#    Crée une base "shadowstack", puis :
cp .env.example .env.local
#    Édite .env.local avec ta DATABASE_URL

# 4. Schéma
npx prisma migrate dev

# 5. Lancer
npm run dev
# → http://localhost:3000
```

### Tester le moteur d'analyse

```bash
npm test   # 17 tests : 14 règles de sécurité + 3 cas de non-faux-positif
```

## 🏗️ Stack technique

- **Frontend** — Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend** — Next.js API Routes, TypeScript strict
- **Base de données** — PostgreSQL + Prisma ORM
- **Auth** — Sessions signées (cookie httpOnly), bcrypt, TOTP (otplib)
- **Email** — Resend (vérification + reset mot de passe)
- **Sécurité** — CSP, HSTS, rate limiting hybride (Redis/mémoire), journal d'audit

## 🔐 Fonctionnalités de sécurité

- ✅ **Authentification** — sessions httpOnly + sameSite, mots de passe bcrypt (coût 10)
- ✅ **2FA** — TOTP (Google Authenticator / Authy) + 8 codes de récupération
- ✅ **Vérification email** — scan bloqué tant que l'email n'est pas confirmé
- ✅ **Rate limiting** — anti-brute-force (5 tentatives / 15 min), hybride Redis/mémoire
- ✅ **RGPD** — suppression de compte avec confirmation (droit à l'effacement)
- ✅ **Journal d'audit** — toutes les actions sensibles tracées avec IP
- ✅ **Sandbox ZIP** — validation avant extraction (exécutables et path traversal refusés)
- ✅ **Headers** — CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy

## 📁 Structure

```
src/
├── app/
│   ├── (app)/          # pages protégées (dashboard, scan, settings, tests...)
│   ├── api/            # routes API (auth, projects, findings, account...)
│   ├── login/ signup/ pricing/ ...
│   └── page.tsx        # racine (redirige selon session)
├── components/         # composants React réutilisables
├── lib/
│   ├── engine/         # 🔍 moteur d'analyse (rules, deps, self-test)
│   ├── auth.ts         # sessions, hachage, vérification
│   ├── audit.ts        # journal d'audit
│   ├── email.ts        # envoi Resend
│   ├── rate-limit.ts   # limitation de débit
│   └── totp.ts         # double authentification
├── db/                 # schéma Prisma + client
└── middleware.ts       # garde d'authentification centralisée
```

## 🧪 Les tests du moteur

Le moteur d'analyse est testé automatiquement (`npm test`). Chaque test :

- **Positif** — envoie du code vulnérable connu, vérifie que la bonne règle se déclenche
- **Négatif** — envoie du code sain, vérifie qu'aucune fausse alerte n'est levée

Résultats visibles en direct dans l'app : **page `/tests`**.

## 📜 Licence

Projet privé — tous droits réservés.
