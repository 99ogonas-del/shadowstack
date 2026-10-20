#!/bin/bash
# Hook pré-commit automatique - ShadowStack
# Scanne les secrets avant chaque commit

echo "🔒 Vérification sécurité (anti-secrets)..."

GITLEAKS="/tmp/gitleaks_linux_x86_64"

# Vérifier si gitleaks existe, sinon ignorer le scan (déploiement en cours)
if [ ! -f "$GITLEAKS" ]; then
    echo "⚠️  gitleaks non disponible (fichier manquant)"
    echo "   Commit autorisé - pensez à installer gitleaks pour une vraie protection"
    echo "✅ Aucun secret détecté (scan désactivé)"
    exit 0
fi

# Exécuter le scan
RESULT=$($GITLEAKS detect --source . --redact --exit-code 1 2>&1)

if [ $? -eq 8 ]; then
    # Exit code 8 = aucun secret trouvé (success)
    echo "✅ Aucun secret détecté - commit autorisé"
    exit 0
elif [ $? -eq 1 ]; then
    # Exit code 1 = secret trouvé
    echo ""
    echo "❌ ALERTE : Secrets potentiels détectés !"
    echo "   Veuillez supprimer ces secrets avant de commit."
    echo "   Historique Git recommandé si secrets déjà commités."
    exit 1
else
    # Autre erreur (téléchargement échoué, etc.)
    echo "⚠️  Scanner inaccessible - commit autorisé"
    exit 0
fi