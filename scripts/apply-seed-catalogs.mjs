/**
 * Applies the data migration `20261008T1417_seed_catalogs`.
 *
 * Prisma 8 app-space synthesizes headRef.invariants as [], so a from===to
 * data self-edge is never selected by `prisma db migrate`. This script runs
 * the attested SQL from that migration package on every container start;
 * inserts are idempotent (ON CONFLICT DO NOTHING).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const opsPath = join(
  root,
  'migrations/app/20261008T1417_seed_catalogs/ops.json',
);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const ops = JSON.parse(readFileSync(opsPath, 'utf8'));
const sql = ops
  .flatMap((op) => op.execute ?? [])
  .map((step) => step.sql)
  .join('\n\n');

if (!sql.trim()) {
  console.error(`No execute SQL in ${opsPath}`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('Catalog seed applied (objectGroup / objectType / workType / counterparties)');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Catalog seed failed:', error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
