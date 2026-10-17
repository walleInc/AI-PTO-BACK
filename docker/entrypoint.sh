#!/bin/sh
set -eu

echo "Applying Prisma migrations..."
yarn prisma db migrate

echo "Applying catalog seed migration..."
node scripts/apply-seed-catalogs.mjs

echo "Starting API on 0.0.0.0:${PORT:-3000}..."
exec node dist/main.js
