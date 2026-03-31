/**
 * Shared test app instance for integration tests.
 *
 * Creates the Express app with rate limiting disabled so tests can make rapid
 * sequential requests without hitting the 429 threshold.
 *
 * All integration test files should import `app` and `prisma` from this module
 * (single source of truth — easy to modify if needed).
 */
import { createApp } from '@/app.js';
import { prisma } from '@/lib/prisma.js';

export const app = createApp({ disableRateLimit: true });
export { prisma };
