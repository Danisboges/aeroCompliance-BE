#!/bin/sh

set -eu

echo "Starting AeroCompliance container..."

# Database mutations remain opt-in. A normal rebuild or restart must not reset,
# seed, or accept destructive schema changes.
if [ "${APPLY_DATABASE_MIGRATIONS:-false}" = "true" ]; then
  echo "[1/3] Applying pending Prisma migrations..."
  npx prisma migrate deploy
elif [ "${SYNC_DATABASE_SCHEMA:-false}" = "true" ]; then
  echo "[1/3] Synchronizing Prisma schema without accepting data loss..."
  npx prisma db push
else
  echo "[1/3] Database schema update skipped."
fi

if [ "${RUN_DATABASE_SEED:-false}" = "true" ]; then
  echo "[2/3] Running database seed..."
  npm run seed
else
  echo "[2/3] Database seed skipped."
fi

echo "[3/3] Starting API server..."
exec npm run start
