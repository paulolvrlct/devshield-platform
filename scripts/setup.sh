#!/usr/bin/env bash
# DevShield — installation initiale du VPS (Debian 12).
# À exécuter une seule fois, en root, sur le VPS fraîchement provisionné.
set -euo pipefail

echo "[1/4] Mise à jour du système…"
apt-get update && apt-get upgrade -y
apt-get install -y ca-certificates curl git ufw

echo "[2/4] Installation de Docker…"
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "[3/4] Configuration du pare-feu (SSH + HTTP + HTTPS)…"
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[4/4] Terminé. Cloner le dépôt puis lancer : docker compose up -d --build"
