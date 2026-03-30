import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import {
  AppError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors.js';

/**
 * Global error-handling middleware (Express 5 compatible — 4-param signature).
 *
 * Catch precedence:
 *  1. AppError subclasses → formatted envelope response
 *  2. PrismaClientKnownRequestError → map to typed AppError
 *  3. Unknown errors → log stack + generic 500
 *
 * Logging policy:
 *  - 4xx errors are NOT logged (operational, client's fault)
 *  - 5xx errors log full stack + method + URL
 */
export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // 1. Handle AppError subclasses (includes ValidationError)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(
        `[${err.statusCode}] ${req.method} ${req.url}`,
        { body: req.body },
        err.stack,
      );
    }

    if (err instanceof ValidationError) {
      res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
        },
      });
      return;
    }

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  // 2. Handle Prisma known request errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    let appError: AppError;

    switch (err.code) {
      case 'P2002':
        appError = new ConflictError('A resource with this value already exists');
        break;
      case 'P2025':
        appError = new NotFoundError('The requested resource was not found');
        break;
      case 'P2003':
        appError = new ConflictError(
          'Operation violates a foreign key constraint',
        );
        break;
      default:
        console.error(`[500] Unhandled Prisma error ${err.code} — ${req.method} ${req.url}`, err.stack);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
          },
        });
        return;
    }

    // 4xx Prisma-mapped errors are not logged
    res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
    return;
  }

  // 3. Unknown / unexpected errors — always 500, always logged
  console.error(`[500] Unhandled error — ${req.method} ${req.url}`, { body: req.body }, err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}
