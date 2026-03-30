import { Router } from 'express';
import {
  createCategorySchema,
  updateCategorySchema,
} from '@gastar/shared';
import { authMiddleware } from '@/middleware/auth.middleware.js';
import { validate } from '@/middleware/validation.middleware.js';
import * as categoriesController from './categories.controller.js';

const router = Router();

/**
 * Categories routes — all mounted under /v1/categories in app.ts
 *
 * GET    /              — list all categories
 * POST   /              — create a new category
 * GET    /:id           — get a single category
 * PATCH  /:id           — update name/icon/color of a category
 * DELETE /:id           — delete a category (pre-flight: no linked transactions)
 */

router.get('/', authMiddleware, categoriesController.list);
router.post(
  '/',
  authMiddleware,
  validate(createCategorySchema),
  categoriesController.create,
);
router.get('/:id', authMiddleware, categoriesController.get);
router.patch(
  '/:id',
  authMiddleware,
  validate(updateCategorySchema),
  categoriesController.update,
);
router.delete('/:id', authMiddleware, categoriesController.remove);

export default router;
