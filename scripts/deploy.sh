#!/usr/bin/env bash
# DevShield — redéploiement sur le VPS.
# À exécuter depuis la racine du projet, sur le VPS.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "[1/3] Récupération de la dernière version…"
git pull origin main

echo "[2/3] Reconstruction et redémarrage des conteneurs…"
docker compose up -d --build

echo "[3/3] Nettoyage des images inutilisées…"
docker image prune -f

echo "Déploiement terminé."
