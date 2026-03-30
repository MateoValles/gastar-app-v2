import type { Category as PrismaCategory } from '@prisma/client';
import type {
  CategoryResponse,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@gastar/shared';
import { prisma } from '@/lib/prisma.js';
import { ConflictError, NotFoundError } from '@/lib/errors.js';

/**
 * Categories Service
 *
 * All methods enforce ownership via `userId` as the first parameter.
 * Every Prisma query includes `userId` in the `where` clause — no resource
 * can be accessed or mutated without matching the authenticated user.
 *
 * Delete has a pre-flight transaction count check to provide a meaningful
 * error instead of a raw FK constraint violation.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Response Mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a Prisma Category row to the API response shape.
 * Serializes dates as ISO 8601. Icon and color are passed through as nullable.
 */
export function toCategoryResponse(category: PrismaCategory): CategoryResponse {
  return {
    id: category.id,
    userId: category.userId,
    name: category.name,
    icon: category.icon,
    color: category.color,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns all categories owned by `userId`, newest first.
 */
export async function listCategories(userId: string): Promise<CategoryResponse[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return categories.map(toCategoryResponse);
}

/**
 * Returns a single category by ID, scoped to `userId`.
 * Throws `NotFoundError` if the category does not exist or is not owned by the user.
 */
export async function getCategory(
  userId: string,
  categoryId: string,
): Promise<CategoryResponse> {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });

  if (!category) {
    throw new NotFoundError('Category not found');
  }

  return toCategoryResponse(category);
}

/**
 * Creates a new category for `userId`.
 */
export async function createCategory(
  userId: string,
  data: CreateCategoryInput,
): Promise<CategoryResponse> {
  const category = await prisma.category.create({
    data: {
      ...data,
      userId,
    },
  });

  return toCategoryResponse(category);
}

/**
 * Updates the `name`, `icon`, and/or `color` of a category owned by `userId`.
 * Throws `NotFoundError` if the category does not exist or is not owned by the user.
 *
 * Uses `updateMany` with compound `{ id, userId }` to enforce ownership in a
 * single query, then fetches the updated row via `getCategory`.
 */
export async function updateCategory(
  userId: string,
  categoryId: string,
  data: UpdateCategoryInput,
): Promise<CategoryResponse> {
  // updateMany with compound where enforces ownership in the query itself.
  // Returns count=0 if not found or not owned → throw NotFoundError.
  const { count } = await prisma.category.updateMany({
    where: { id: categoryId, userId },
    data,
  });

  if (count === 0) {
    throw new NotFoundError('Category not found');
  }

  // Fetch the updated row for the response (updateMany doesn't return records).
  return getCategory(userId, categoryId);
}

/**
 * Deletes a category owned by `userId`.
 *
 * Pre-flight check: count transactions linked to this category. If any exist,
 * throw `ConflictError(409)` — the user must reassign those transactions first.
 * This produces a meaningful error message instead of a raw FK constraint violation.
 *
 * Throws `NotFoundError` if the category does not exist or is not owned by the user.
 * Returns the deleted category data for the response envelope.
 */
export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<CategoryResponse> {
  // Ownership check first — getCategory throws NotFoundError if the category
  // does not exist or is not owned by this user. This MUST run before the
  // pre-flight transaction count to avoid leaking existence of other users' categories.
  const category = await getCategory(userId, categoryId);

  // Pre-flight: check for associated transactions BEFORE attempting delete.
  const txCount = await prisma.transaction.count({
    where: { categoryId },
  });

  if (txCount > 0) {
    throw new ConflictError(
      `Cannot delete category: it has ${txCount} associated transaction(s). Reassign them first.`,
    );
  }

  // deleteMany with compound where provides defense-in-depth ownership enforcement.
  const { count } = await prisma.category.deleteMany({
    where: { id: categoryId, userId },
  });

  if (count === 0) {
    throw new NotFoundError('Category not found');
  }

  return category;
}
