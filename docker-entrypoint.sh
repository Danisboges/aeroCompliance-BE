#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Docker Entrypoint Script..."

# 1. Pastikan skema database tersinkronisasi
echo "[1/3] Pushing database schema..."
npx prisma db push --accept-data-loss

# 2. Jalankan seeder untuk mengisi data master & mock dashboard
echo "[2/3] Seeding database..."
npm run seed

# 3. Jalankan aplikasi utama
echo "[3/3] Starting server..."
exec npm run start
