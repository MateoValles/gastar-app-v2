import type { Request, Response } from 'express';
import * as usersService from './users.service.js';

/**
 * Users Controller — thin HTTP layer.
 *
 * Rules:
 *  - NO try/catch — errors propagate to the global error middleware
 *  - NO direct Prisma access — delegates to usersService
 *  - Handles all HTTP concerns: status codes, response envelope
 *  - `req.userId!` is safe — authMiddleware guarantees it is set
 *  - Express 5 natively catches async errors — no asyncHandler wrapper needed
 */

/**
 * GET /v1/users/me
 *
 * Returns the authenticated user's profile (id, email, name, language).
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  const data = await usersService.getMe(req.userId!);

  res.status(200).json({ success: true, data });
}

/**
 * PATCH /v1/users/me
 *
 * Updates the authenticated user's profile.
 * Body is validated upstream by `validate(updateUserSchema)` middleware.
 */
export async function updateMe(req: Request, res: Response): Promise<void> {
  const data = await usersService.updateMe(req.userId!, req.body);

  res.status(200).json({ success: true, data });
}
