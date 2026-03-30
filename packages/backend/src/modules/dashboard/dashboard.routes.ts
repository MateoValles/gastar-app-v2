import { Router } from 'express';
import { authMiddleware } from '@/middleware/auth.middleware.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

/**
 * Dashboard routes — all mounted under /v1/dashboard in app.ts
 *
 * GET  /summary  — aggregated dashboard data for the authenticated user
 */

router.get('/summary', authMiddleware, dashboardController.getSummary);

export default router;
