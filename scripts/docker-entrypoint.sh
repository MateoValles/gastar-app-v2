#!/bin/sh
set -eu

echo "[entrypoint] Running Prisma migrations..."
./node_modules/.bin/prisma migrate deploy --schema=database/prisma/schema.prisma

echo "[entrypoint] Starting backend..."
exec node packages/backend/dist/index.js
