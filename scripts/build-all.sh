#!/bin/sh
set -e

echo "[build] Generating Prisma client..."
cd apps/api
npx prisma generate
cd ../..

echo "[build] Compiling API..."
cd apps/api
npx tsc -p tsconfig.json
cd ../..

echo "[build] Building Next.js..."
cd apps/web
npx next build
cd ../..

echo "[build] Done."
