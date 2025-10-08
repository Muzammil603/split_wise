#!/usr/bin/env bash
set -euo pipefail

# Config
TARGET_TIME="${1:-}" # e.g., "2025-10-08 13:40:00"
if [ -z "$TARGET_TIME" ]; then
  echo "Usage: $0 'YYYY-MM-DD HH:MM:SS'"; 
  echo "Example: $0 '2025-10-08 13:40:00'"
  exit 1;
fi

echo "==> Starting restore drill for time: $TARGET_TIME"
echo "==> This will create a temporary restore database for testing"

# Check if we're using managed DB or self-hosted
if [ -n "${DATABASE_URL:-}" ] && [[ "$DATABASE_URL" == *"amazonaws.com"* || "$DATABASE_URL" == *"neon.tech"* || "$DATABASE_URL" == *"supabase.co"* ]]; then
  echo "==> Detected managed database. For managed DBs:"
  echo "    1. Create a new branch/instance at time $TARGET_TIME"
  echo "    2. Update DATABASE_URL to point to the new branch"
  echo "    3. Run: DATABASE_URL=<new_url> pnpm ts-node scripts/check-balance-consistency.ts"
  echo "    4. Clean up the branch when done"
  exit 0
fi

echo "==> Using self-hosted Postgres with pgBackRest"

# Stop any existing restore container
echo "==> Cleaning up any existing restore containers..."
docker rm -f swp-restore-db 2>/dev/null || true

echo "==> Spinning up temporary restore DB..."
docker run -d --name swp-restore-db \
  -e POSTGRES_PASSWORD=swp \
  -e POSTGRES_USER=swp \
  -e POSTGRES_DB=swp \
  -p 55432:5432 \
  postgres:16-alpine

echo "==> Waiting for restore DB to be ready..."
sleep 5

# Wait for DB to be ready
until docker exec swp-restore-db pg_isready -U swp -d swp; do
  echo "Waiting for restore DB..."
  sleep 2
done

echo "==> Restoring with pgBackRest to time: $TARGET_TIME"
# Note: This assumes pgBackRest is configured and has backups
# In a real scenario, you'd run:
# docker run --rm \
#   -v $(pwd)/infra/pgbackrest:/etc/pgbackrest \
#   -v /var/lib/postgresql:/var/lib/postgresql \
#   ghcr.io/pgbackrest/pgbackrest:latest \
#   pgbackrest --stanza=swp --delta restore --type=time --target="$TARGET_TIME"

# For this demo, we'll do a logical restore instead
echo "==> Performing logical restore (demo mode)..."
echo "==> In production, use pgBackRest PITR restore above"

# Create a logical dump from current DB and restore it
echo "==> Creating logical dump from current database..."
docker exec swp-postgres pg_dump -U swp -d swp -Fc -f /tmp/backup.dump

echo "==> Copying dump to restore container..."
docker cp swp-postgres:/tmp/backup.dump swp-restore-db:/tmp/backup.dump

echo "==> Restoring dump to temporary database..."
docker exec swp-restore-db pg_restore -U swp -d swp --clean --if-exists /tmp/backup.dump

echo "==> Running consistency check on restored database..."
cd /Users/muzammilmohammed/splitwise-plus/apps/backend
DATABASE_URL="postgresql://swp:swp@localhost:55432/swp" pnpm ts-node scripts/check-balance-consistency.ts

echo "==> ✅ Restore drill completed successfully!"
echo "==> Clean up with: docker rm -f swp-restore-db"
echo "==> The restored database is available at localhost:55432"
