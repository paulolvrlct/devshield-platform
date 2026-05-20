#!/usr/bin/env bash
# DevShield — sauvegarde de la base de données PostgreSQL.
# Usage : ./backups/backup.sh   (depuis la racine du projet)
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

# shellcheck source=/dev/null
set -a
source "$PROJECT_DIR/.env"
set +a

docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_DIR/db-$TIMESTAMP.sql"

# Conserve les 14 dernières sauvegardes.
ls -1t "$BACKUP_DIR"/db-*.sql 2>/dev/null | tail -n +15 | xargs -r rm --

echo "Sauvegarde créée : $BACKUP_DIR/db-$TIMESTAMP.sql"
