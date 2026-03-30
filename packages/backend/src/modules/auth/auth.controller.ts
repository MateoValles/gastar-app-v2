import type { Request, Response } from 'express';
import { authConfig } from '@/config/auth.js';
import { UnauthorizedError } from '@/lib/errors.js';
import * as authService from './auth.service.js';

/**
 * Auth Controller — thin HTTP layer.
 *
 * Rules:
 *  - NO try/catch — errors propagate to the global error middleware
 *  - NO direct Prisma access — delegates to authService
 *  - Handles all HTTP concerns: cookies, status codes, response envelope
 *  - Express 5 natively catches async errors — no asyncHandler wrapper needed
 */

/**
 * POST /v1/auth/register
 *
 * Registers a new user, sets the refresh token cookie, and returns the
 * access token + user profile.
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { accessToken, refreshToken, user } = await authService.register(
    req.body,
  );

  res.cookie('refreshToken', refreshToken, authConfig.cookie);
  res.status(201).json({
    success: true,
    data: { accessToken, user },
  });
}

/**
 * POST /v1/auth/login
 *
 * Authenticates the user, sets the refresh token cookie, and returns the
 * access token + user profile.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { accessToken, refreshToken, user } = await authService.login(req.body);

  res.cookie('refreshToken', refreshToken, authConfig.cookie);
  res.status(200).json({
    success: true,
    data: { accessToken, user },
  });
}

/**
 * POST /v1/auth/refresh
 *
 * Reads the refresh token from the HttpOnly cookie, issues a new access token,
 * and rotates the refresh token cookie.
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken as string | undefined;

  if (!token) {
    throw new UnauthorizedError('Refresh token not found');
  }

  const { accessToken, refreshToken: newRefreshToken, user } =
    await authService.refresh(token);

  res.cookie('refreshToken', newRefreshToken, authConfig.cookie);
  res.status(200).json({
    success: true,
    data: { accessToken, user },
  });
}

/**
 * POST /v1/auth/logout
 *
 * Clears the refresh token cookie. JWT auth is stateless — no server-side
 * token invalidation is needed.
 */
export function logout(_req: Request, res: Response): void {
  res.clearCookie('refreshToken', {
    httpOnly: authConfig.cookie.httpOnly,
    secure: authConfig.cookie.secure,
    sameSite: authConfig.cookie.sameSite,
    path: authConfig.cookie.path,
  });
  res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully' },
  });
}

/**
 * POST /v1/auth/forgot-password
 *
 * Initiates the password reset flow. Always returns 200 regardless of whether
 * the email exists — prevents email enumeration attacks.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
): Promise<void> {
  await authService.forgotPassword(req.body.email);

  res.status(200).json({
    success: true,
    data: {
      message:
        'If an account with that email exists, a reset link has been sent',
    },
  });
}

/**
 * POST /v1/auth/reset-password
 *
 * Resets the user's password using the token received via email.
 */
export async function resetPassword(
  req: Request,
  res: Response,
): Promise<void> {
  await authService.resetPassword(req.body.token, req.body.password);

  res.status(200).json({
    success: true,
    data: { message: 'Password reset successfully' },
  });
}
