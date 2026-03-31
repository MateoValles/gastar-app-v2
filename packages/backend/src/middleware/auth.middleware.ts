import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { errors as joseErrors, jwtVerify } from 'jose';
import { authConfig } from '@/config/auth.js';
import { UnauthorizedError } from '@/lib/errors.js';
import { prisma } from '@/lib/prisma.js';

/**
 * TOKEN_EXPIRED is a specialization of UnauthorizedError that signals the
 * access token is expired (not invalid). Clients use this to trigger a
 * silent token refresh via the /refresh endpoint.
 */
class TokenExpiredError extends UnauthorizedError {
  override readonly code = 'TOKEN_EXPIRED';

  constructor() {
    super('Token has expired');
  }
}

/**
 * Middleware that authenticates requests via a JWT Bearer token.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the token
 * using the access token secret, and attaches `req.userId` for downstream
 * controllers and services.
 *
 * Throws `UnauthorizedError` on:
 *  - Missing or malformed Authorization header
 *  - Invalid token (wrong signature, wrong issuer, etc.)
 *
 * Throws `TokenExpiredError` (code: 'TOKEN_EXPIRED') when the token is
 * expired so the client knows to attempt a refresh.
 */
export const authMiddleware: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Authentication required');
  }

  const token = authHeader.slice(7); // Remove 'Bearer ' prefix

  try {
    const { payload } = await jwtVerify(token, authConfig.accessToken.secret, {
      issuer: 'gastar',
    });

    if (typeof payload.sub !== 'string' || !payload.sub) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // Verify user still exists in DB (prevents deleted users with valid JWTs from accessing resources)
    const userExists = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true }, // Minimal query — only need existence check
    });

    if (!userExists) {
      throw new UnauthorizedError('User no longer exists');
    }

    req.userId = payload.sub;
    next();
  } catch (err) {
    // Re-throw our own typed errors as-is (e.g. UnauthorizedError thrown above)
    if (err instanceof UnauthorizedError) {
      throw err;
    }

    // jose throws JWTExpired for expired tokens — map to TOKEN_EXPIRED code
    if (err instanceof joseErrors.JWTExpired) {
      throw new TokenExpiredError();
    }

    // Any other jose/JWT error → generic unauthorized
    throw new UnauthorizedError('Invalid token');
  }
};
