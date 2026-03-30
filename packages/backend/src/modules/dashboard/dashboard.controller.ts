import type { Request, Response } from 'express';
import * as dashboardService from './dashboard.service.js';

/**
 * Dashboard Controller — thin HTTP layer.
 *
 * Rules:
 *  - NO try/catch — errors propagate to the global error middleware
 *  - NO direct Prisma access — delegates to dashboardService
 *  - `req.userId!` is safe — authMiddleware guarantees it is set
 *  - Express 5 natively catches async errors — no asyncHandler wrapper needed
 */

/**
 * GET /v1/dashboard/summary
 *
 * Returns all aggregated dashboard data for the authenticated user:
 * currency groups, account list, expenses by category, and recent transactions.
 */
export async function getSummary(req: Request, res: Response): Promise<void> {
  const data = await dashboardService.getSummary(req.userId!);

  res.status(200).json({ success: true, data });
}
