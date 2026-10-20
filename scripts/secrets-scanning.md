# Scanning Git History for Secrets

## Why It Matters

Chaque secret commité dans l'historique Git reste accessible même après suppression du code. GitHub, GitLab et autres plateformes maintiennent un cache de l'historique. Un secret dans un commit annulé ou supprimé peut encore être exploité.

## Tools Available

### gitleaks (recommandé)
```bash
# Scan complet
gitleaks detect --source . --verbose --redact --exit-code 1

# Scan avec règles personnalisées
gitleaks detect --source . --path-config .gitleaks.toml
```

### git-secrets
```bash
# Installer
git clone https://github.com/awslabs/git-secrets.git
cd git-secrets && sudo make install

# Scanner
git secrets --scan
```### detect-secrets (PyCharm)
```bash
pip install detect-secrets
detect-secrets scan > .secrets.baseline
detect-secrets audit .secrets.baseline
```

## Pre-Commit Hook Setup

### Option 1: Script dédié
```bash
#!/bin/bash
# .git/hooks/pre-commit
gitleaks detect --source . --redact --exit-code 1
exit $?
```

### Option 2: npm script
```json
{
  "scripts": {
    "scan-secrets": "gitleaks detect --source . --redact --exit-code 1",
    "pre-commit": "npm run scan-secrets"
  }
}
```

### Option 3: Husky (déjà dans le projet)
```bash
npx husky add .husky/pre-commit "npm run scan-secrets"
```

## Historical Cleanup

Si un secret est déjà dans l'historique :

1. **Révoquer immédiatement** le secret (c'est la moitié de la solution)
2. **Utiliser BFG Repo-Cleaner** pour supprimer de l'historique :
```bash
java -jar bfg.jar --replace-text passwords.txt --repo /path/to/repo
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

3. **Force push** vers le remote (attention aux collaborators) :
```bash
git push --force
```

## False Positives to Ignore

- URLs de sponsoring GitHub (`github.com/sponsors/*`)
- Images base64 dans les fichiers CSS
- Données de test dans les fixtures

## CI/CD Integration

GitHub Actions :
```yaml
- name: Scan for secrets
  uses: gitleaks/gitleaks-action@v2
  with:
    config: .gitleaks.toml
```

## Exit Codes

- `0` : Aucun secret trouvé - commit autorisé
- `1` : Secrets détectés - commit bloqué
- `8` : Aucun secret trouvé (gitleaks) - commit autorisé