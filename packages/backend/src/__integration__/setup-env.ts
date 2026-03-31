/**
 * Vitest setupFile — runs in the WORKER process before any test file is imported.
 *
 * This MUST run before any module that imports `@/config/env.ts` because env.ts
 * runs Zod validation at import time and calls process.exit(1) on failure.
 * Loading .env.test here populates process.env so the validation passes.
 *
 * ESM note: __dirname is not available in ESM — use import.meta.url + fileURLToPath.
 */
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../.env.test') });
