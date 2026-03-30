import { Router } from 'express';
import { updateUserSchema } from '@gastar/shared';
import { authMiddleware } from '@/middleware/auth.middleware.js';
import { validate } from '@/middleware/validation.middleware.js';
import * as usersController from './users.controller.js';

const router = Router();

/**
 * Users routes — all mounted under /v1/users in app.ts
 *
 * GET   /me   — return the authenticated user's profile
 * PATCH /me   — update name, email, and/or language
 */

router.get('/me', authMiddleware, usersController.getMe);
router.patch(
  '/me',
  authMiddleware,
  validate(updateUserSchema),
  usersController.updateMe,
);

export default router;
