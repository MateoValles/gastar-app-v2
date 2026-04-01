#!/bin/sh
set -eu

echo "[entrypoint] Running Prisma migrations..."
pnpm exec prisma migrate deploy --schema=database/prisma/schema.prisma

echo "[entrypoint] Starting backend..."
exec node packages/backend/dist/index.js
