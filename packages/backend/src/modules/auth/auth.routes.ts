import { Router } from 'express';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from '@gastar/shared';
import { authMiddleware } from '@/middleware/auth.middleware.js';
import { validate } from '@/middleware/validation.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

/**
 * Auth routes — all mounted under /v1/auth in app.ts
 *
 * POST /register        — create account
 * POST /login           — authenticate
 * POST /refresh         — rotate tokens via cookie
 * POST /logout          — clear cookie (requires auth)
 * POST /forgot-password — send reset email
 * POST /reset-password  — apply new password
 */

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authMiddleware, authController.logout);
router.post(
  '/forgot-password',
  validate(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  '/reset-password',
  validate(resetPasswordSchema),
  authController.resetPassword,
);

export default router;
