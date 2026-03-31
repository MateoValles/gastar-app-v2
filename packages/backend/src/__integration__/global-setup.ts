/**
 * Vitest globalSetup — runs ONCE before all test suites in the main process.
 *
 * Responsibilities:
 * 1. Load .env.test so DATABASE_URL is available for prisma db push
 * 2. Reset the test database schema (drop + recreate all tables from schema.prisma)
 *
 * ESM note: __dirname is not available in ESM — use import.meta.url + fileURLToPath.
 */
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function setup(): Promise<void> {
  // Load .env.test so DATABASE_URL is available for prisma db push
  config({ path: resolve(__dirname, '../../.env.test') });

  // Safety guard — prevent accidental data loss if .env.test is misconfigured
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(
      `global-setup: NODE_ENV must be "test" but got "${process.env.NODE_ENV}". ` +
        'Refusing to run --force-reset against a non-test environment.',
    );
  }

  const dbUrl = process.env.DATABASE_URL ?? '';
  if (!dbUrl.includes('_test')) {
    throw new Error(
      'global-setup: DATABASE_URL does not contain "_test". ' +
        `Refusing to run --force-reset against "${dbUrl}" — this may not be a test database.`,
    );
  }

  console.log('\n🗄️  Resetting test database schema...');

  // Reset test database schema — drops all tables, recreates from schema.prisma.
  // cwd must point to the database/ folder where schema.prisma lives.
  // --force-reset: drops existing tables before pushing
  // --skip-generate: Prisma client already generated from dev workflow — saves ~2s
  execSync('npx prisma db push --force-reset --skip-generate', {
    cwd: resolve(__dirname, '../../../../database'),
    env: { ...process.env },
    stdio: 'pipe',
  });

  console.log('✅ Test database schema reset complete.\n');
}

export async function teardown(): Promise<void> {
  // No teardown — leave DB intact for post-run debugging.
  // Next test run's setup() will reset it anyway.
}
