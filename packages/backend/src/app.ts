import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { env } from '@/config/env.js';
import { errorMiddleware } from '@/middleware/error.middleware.js';
import { NotFoundError } from '@/lib/errors.js';
import authRoutes from '@/modules/auth/auth.routes.js';
import accountsRoutes from '@/modules/accounts/accounts.routes.js';
import categoriesRoutes from '@/modules/categories/categories.routes.js';
import transactionsRoutes from '@/modules/transactions/transactions.routes.js';
import usersRoutes from '@/modules/users/users.routes.js';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes.js';

// ── App Options ───────────────────────────────────────────────────────────────

export interface AppOptions {
  /**
   * When true, auth rate limiter is not applied.
   * Used in integration tests to avoid 429 errors during rapid sequential requests.
   */
  disableRateLimit?: boolean;
}

// ── App Factory ───────────────────────────────────────────────────────────────

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  // ── Security middleware ──────────────────────────────────────────────────────

  // 1. Security headers (must be first)
  app.use(helmet());

  // 2. CORS — allow configured origin with credentials for cookie-based auth
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  // 3. Cookie parser — required for req.cookies (refresh token endpoint)
  app.use(cookieParser());

  // 4. Body parser
  app.use(express.json({ limit: '1mb' }));

  // ── Rate limiting ──────────────────────────────────────────────────────────

  /**
   * Auth rate limiter — 20 requests per 15-minute window.
   * Applied to all /v1/auth routes. Thresholds can be tuned per-route later.
   */
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    },
  });

  // ── Routes ──────────────────────────────────────────────────────────────────

  // Health check (no rate limit — monitoring tools use this)
  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  // Auth routes — conditionally apply rate limiter
  if (options.disableRateLimit) {
    app.use('/v1/auth', authRoutes);
  } else {
    app.use('/v1/auth', authLimiter, authRoutes);
  }

  // Accounts routes
  app.use('/v1/accounts', accountsRoutes);

  // Categories routes
  app.use('/v1/categories', categoriesRoutes);

  // Transactions routes
  app.use('/v1/transactions', transactionsRoutes);

  // Users routes
  app.use('/v1/users', usersRoutes);

  // Dashboard routes
  app.use('/v1/dashboard', dashboardRoutes);

  // ── 404 handler ───────────────────────────────────────────────────────────

  app.use((_req, _res, next) => {
    next(new NotFoundError('Route not found'));
  });

  // ── Global error handler (MUST be last) ──────────────────────────────────

  app.use(errorMiddleware);

  return app;
}

// Backwards-compatible default export — pre-created singleton for index.ts
export default createApp();
