import { Router } from 'express';
import {
  createTransactionSchema,
  updateTransactionSchema,
  listTransactionsQuerySchema,
} from '@gastar/shared';
import { authMiddleware } from '@/middleware/auth.middleware.js';
import { validate, validateQuery } from '@/middleware/validation.middleware.js';
import * as transactionsController from './transactions.controller.js';

const router = Router();

/**
 * Transactions routes — all mounted under /v1/transactions in app.ts
 *
 * POST   /              — create a transaction (income, expense, or transfer)
 * GET    /              — list transactions with filters + pagination
 * GET    /:id           — get a single transaction
 * PATCH  /:id           — update a transaction
 * DELETE /:id           — delete a transaction (reverses balance)
 */

router.post(
  '/',
  authMiddleware,
  validate(createTransactionSchema),
  transactionsController.create,
);

router.get(
  '/',
  authMiddleware,
  validateQuery(listTransactionsQuerySchema),
  transactionsController.list,
);

router.get('/:id', authMiddleware, transactionsController.getById);

router.patch(
  '/:id',
  authMiddleware,
  validate(updateTransactionSchema),
  transactionsController.update,
);

router.delete('/:id', authMiddleware, transactionsController.remove);

export default router;
