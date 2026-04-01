import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
  /**
   * Override for SERVE_FRONTEND env var.
   * Useful in unit tests that want to exercise the static serving code path
   * without requiring real env var setup or module re-loading.
   */
  serveFrontend?: boolean;
  /**
   * Override for FRONTEND_DIST_PATH env var.
   * When serveFrontend is true and this is provided, it takes precedence over
   * both env.FRONTEND_DIST_PATH and the default resolved path.
   */
  frontendDistPath?: string;
}

// ── App Factory ───────────────────────────────────────────────────────────────

export function createApp(options: AppOptions = {}): Express {
  const app = express();

  // ── Security middleware ──────────────────────────────────────────────────────

  // 1. Security headers (must be first)
  app.use(helmet());

  // 2. CORS — only needed when frontend is on a different origin (development).
  //    In single-container mode (SERVE_FRONTEND=true), browser requests are same-origin
  //    so CORS headers are not required and CORS_ORIGIN may be omitted.
  if (env.CORS_ORIGIN) {
    app.use(
      cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
      }),
    );
  }

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

  // ── Static frontend serving (single-container mode) ───────────────────────
  //
  // When SERVE_FRONTEND=true (via env or options override), Express serves the
  // compiled SPA and handles the SPA fallback (any route not matched by
  // /health or /v1/* returns index.html).
  //
  // IMPORTANT: This block MUST come after all API routes so that:
  //   1. API routes are always matched first.
  //   2. The 404 handler below is only reached for unmatched API routes.
  //   3. The SPA fallback only applies to frontend routes.

  const shouldServeFrontend = options.serveFrontend ?? env.SERVE_FRONTEND;

  if (shouldServeFrontend) {
    const distPath =
      options.frontendDistPath ??
      env.FRONTEND_DIST_PATH ??
      // Resolve relative to this file: packages/backend/src/app.ts
      // → ../../.. = packages/ → ../../../frontend/dist = packages/frontend/dist
      path.resolve(fileURLToPath(import.meta.url), '../../../frontend/dist');

    // Serve static assets (JS, CSS, images, etc.)
    app.use(express.static(distPath));

    // SPA fallback — any GET request that hasn't matched an API route returns
    // index.html so that React Router can handle client-side navigation.
    // Only GET requests are handled; POST/PATCH/DELETE fall through to 404.
    app.get(/^(?!\/v1(?:\/|$)|\/health(?:\/|$)).*$/, (req, res, next) => {
      // Requests that look like asset files (e.g. /app.js, /styles.css, /favicon.svg)
      // should NOT receive index.html. Let them fall through so Express returns 404.
      if (path.extname(req.path)) {
        return next();
      }

      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

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
