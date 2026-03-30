import type { Request, Response } from 'express';
import { z } from 'zod';
import { ValidationError } from '@/lib/errors.js';
import * as categoriesService from './categories.service.js';

/**
 * Categories Controller — thin HTTP layer.
 *
 * Rules:
 *  - NO try/catch — errors propagate to the global error middleware
 *  - NO direct Prisma access — delegates to categoriesService
 *  - Handles all HTTP concerns: status codes, response envelope
 *  - `req.userId!` is safe — authMiddleware guarantees it is set
 *  - Express 5 natively catches async errors — no asyncHandler wrapper needed
 */

/** Zod schema for validating UUID path parameters (:id). */
const categoryIdSchema = z.string().uuid('Invalid category ID — must be a UUID');

/**
 * Validates the `:id` path param as a UUID.
 * Throws `ValidationError` (400) if invalid, matching the global error shape.
 */
function parseCategoryId(req: Request): string {
  const result = categoryIdSchema.safeParse(req.params.id);
  if (!result.success) {
    throw new ValidationError('Invalid category ID', result.error.issues);
  }
  return result.data;
}

/**
 * GET /v1/categories
 *
 * Returns all categories owned by the authenticated user.
 */
export async function list(req: Request, res: Response): Promise<void> {
  const categories = await categoriesService.listCategories(req.userId!);

  res.status(200).json({ success: true, data: categories });
}

/**
 * GET /v1/categories/:id
 *
 * Returns a single category by ID, scoped to the authenticated user.
 */
export async function get(req: Request, res: Response): Promise<void> {
  const categoryId = parseCategoryId(req);
  const category = await categoriesService.getCategory(req.userId!, categoryId);

  res.status(200).json({ success: true, data: category });
}

/**
 * POST /v1/categories
 *
 * Creates a new category for the authenticated user.
 * Body is validated upstream by `validate(createCategorySchema)` middleware.
 */
export async function create(req: Request, res: Response): Promise<void> {
  const category = await categoriesService.createCategory(req.userId!, req.body);

  res.status(201).json({ success: true, data: category });
}

/**
 * PATCH /v1/categories/:id
 *
 * Updates the `name`, `icon`, and/or `color` of a category owned by the authenticated user.
 * Body is validated upstream by `validate(updateCategorySchema)` middleware.
 */
export async function update(req: Request, res: Response): Promise<void> {
  const categoryId = parseCategoryId(req);
  const category = await categoriesService.updateCategory(
    req.userId!,
    categoryId,
    req.body,
  );

  res.status(200).json({ success: true, data: category });
}

/**
 * DELETE /v1/categories/:id
 *
 * Deletes a category owned by the authenticated user.
 * Returns the deleted category in the response envelope.
 */
export async function remove(req: Request, res: Response): Promise<void> {
  const categoryId = parseCategoryId(req);
  const category = await categoriesService.deleteCategory(req.userId!, categoryId);

  res.status(200).json({ success: true, data: category });
}
