#!/usr/bin/env bash
# DevShield — automated backup: PostgreSQL dump + compressed archive.
# Usage: ./backups/backup.sh (from project root, or via cron)
# Cron setup (daily at 3 AM):
#   0 3 * * * /home/debian/vps/backups/backup.sh >> /home/debian/vps/backups/backup.log 2>&1
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

# Load env vars
# shellcheck source=/dev/null
set -a
source "$PROJECT_DIR/.env"
set +a

echo "[$TIMESTAMP] Starting backup..."

# 1. PostgreSQL dump (compressed)
docker compose -f "$PROJECT_DIR/docker-compose.yml" exec -T postgres \
  pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/db-$TIMESTAMP.sql.gz"

echo "[$TIMESTAMP] Database backup done: db-$TIMESTAMP.sql.gz ($(du -h "$BACKUP_DIR/db-$TIMESTAMP.sql.gz" | cut -f1))"

# 2. Rotate: keep last 30 backups
ls -1t "$BACKUP_DIR"/db-*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --

echo "[$TIMESTAMP] Backup completed successfully."
