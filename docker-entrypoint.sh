#!/bin/bash
set -e

echo "[1/2] Applying database migrations..."
npx prisma migrate deploy

echo "[2/2] Starting server..."
exec npm run start
