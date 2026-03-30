import { Router } from 'express';
import {
  createAccountSchema,
  updateAccountSchema,
} from '@gastar/shared';
import { authMiddleware } from '@/middleware/auth.middleware.js';
import { validate } from '@/middleware/validation.middleware.js';
import * as accountsController from './accounts.controller.js';

const router = Router();

/**
 * Accounts routes — all mounted under /v1/accounts in app.ts
 *
 * GET    /              — list all accounts
 * POST   /              — create a new account
 * GET    /:id           — get a single account
 * PATCH  /:id           — update name/type of an account
 * DELETE /:id           — delete an account
 */

router.get('/', authMiddleware, accountsController.list);
router.post(
  '/',
  authMiddleware,
  validate(createAccountSchema),
  accountsController.create,
);
router.get('/:id', authMiddleware, accountsController.get);
router.patch(
  '/:id',
  authMiddleware,
  validate(updateAccountSchema),
  accountsController.update,
);
router.delete('/:id', authMiddleware, accountsController.remove);

export default router;
