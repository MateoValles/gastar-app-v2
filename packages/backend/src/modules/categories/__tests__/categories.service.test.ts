import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPrisma, getMockPrisma } from '@/test/prisma-mock.js';
import { NotFoundError, ConflictError } from '@/lib/errors.js';

// Mock Prisma before importing the service
vi.mock('@/lib/prisma.js', () => ({ prisma: createMockPrisma() }));

// Import after mock setup
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  toCategoryResponse,
} from '../categories.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-001';
const CATEGORY_ID = 'cat-uuid-001';
const OTHER_USER_ID = 'user-uuid-999';

const NOW = new Date('2024-01-15T10:00:00.000Z');
const UPDATED = new Date('2024-01-15T12:00:00.000Z');

/** A Prisma Category row as returned from the DB */
const prismaCategory = {
  id: CATEGORY_ID,
  userId: USER_ID,
  name: 'Food & Dining',
  icon: 'utensils',
  color: '#FF5733',
  createdAt: NOW,
  updatedAt: NOW,
};

/** The expected API response shape for the category above */
const expectedCategory = {
  id: CATEGORY_ID,
  userId: USER_ID,
  name: 'Food & Dining',
  icon: 'utensils',
  color: '#FF5733',
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

/** A category with nullable optional fields */
const prismaCategoryMinimal = {
  id: CATEGORY_ID,
  userId: USER_ID,
  name: 'Uncategorized',
  icon: null,
  color: null,
  createdAt: NOW,
  updatedAt: NOW,
};

/** Second category for list tests */
const prismaCategory2 = {
  id: 'cat-uuid-002',
  userId: USER_ID,
  name: 'Transport',
  icon: 'car',
  color: '#3B82F6',
  createdAt: UPDATED,
  updatedAt: UPDATED,
};

// ─────────────────────────────────────────────────────────────────────────────
// toCategoryResponse (mapper)
// ─────────────────────────────────────────────────────────────────────────────

describe('toCategoryResponse', () => {
  it('serializes all fields correctly including ISO date strings', () => {
    const result = toCategoryResponse(prismaCategory);

    expect(result).toEqual(expectedCategory);
    expect(typeof result.createdAt).toBe('string');
    expect(typeof result.updatedAt).toBe('string');
    expect(result.createdAt).toBe('2024-01-15T10:00:00.000Z');
  });

  it('passes through null icon and color without transformation', () => {
    const result = toCategoryResponse(prismaCategoryMinimal);

    expect(result.icon).toBeNull();
    expect(result.color).toBeNull();
  });

  it('returns all required fields in the CategoryResponse shape', () => {
    const result = toCategoryResponse(prismaCategory);

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('userId');
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('icon');
    expect(result).toHaveProperty('color');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// listCategories
// ─────────────────────────────────────────────────────────────────────────────

describe('listCategories', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty array when user has no categories', async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);

    const result = await listCategories(USER_ID);

    expect(result).toEqual([]);
  });

  it('returns all categories mapped to CategoryResponse shape', async () => {
    mockPrisma.category.findMany.mockResolvedValue([prismaCategory2, prismaCategory]);

    const result = await listCategories(USER_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'cat-uuid-002',
      userId: USER_ID,
      name: 'Transport',
      icon: 'car',
      color: '#3B82F6',
      createdAt: UPDATED.toISOString(),
      updatedAt: UPDATED.toISOString(),
    });
  });

  it('queries with userId filter and orders by createdAt desc', async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);

    await listCategories(USER_ID);

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('does NOT return categories belonging to other users', async () => {
    mockPrisma.category.findMany.mockResolvedValue([]);

    await listCategories(OTHER_USER_ID);

    // The query must be scoped to OTHER_USER_ID, not any userId
    expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: OTHER_USER_ID } }),
    );
  });

  it('handles categories with null icon and color', async () => {
    mockPrisma.category.findMany.mockResolvedValue([prismaCategoryMinimal]);

    const result = await listCategories(USER_ID);

    expect(result[0].icon).toBeNull();
    expect(result[0].color).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCategory
// ─────────────────────────────────────────────────────────────────────────────

describe('getCategory', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the category when it exists and belongs to the user', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);

    const result = await getCategory(USER_ID, CATEGORY_ID);

    expect(result).toEqual(expectedCategory);
  });

  it('queries with both id and userId for ownership enforcement', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);

    await getCategory(USER_ID, CATEGORY_ID);

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
    });
  });

  it('throws NotFoundError when the category does not exist', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await expect(getCategory(USER_ID, CATEGORY_ID)).rejects.toThrow(NotFoundError);
    await expect(getCategory(USER_ID, CATEGORY_ID)).rejects.toThrow('Category not found');
  });

  it('throws NotFoundError with correct statusCode (404) and code', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await expect(getCategory(USER_ID, CATEGORY_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws NotFoundError when the category belongs to a different user (ownership isolation)', async () => {
    // findFirst returns null because userId doesn't match in the where clause
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await expect(getCategory(OTHER_USER_ID, CATEGORY_ID)).rejects.toThrow(NotFoundError);
  });

  it('returns category with null optional fields correctly', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategoryMinimal);

    const result = await getCategory(USER_ID, CATEGORY_ID);

    expect(result.icon).toBeNull();
    expect(result.color).toBeNull();
    expect(result.name).toBe('Uncategorized');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// createCategory
// ─────────────────────────────────────────────────────────────────────────────

describe('createCategory', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a category with all fields and returns CategoryResponse', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null); // no duplicate
    mockPrisma.category.create.mockResolvedValue(prismaCategory);

    const result = await createCategory(USER_ID, {
      name: 'Food & Dining',
      icon: 'utensils',
      color: '#FF5733',
    });

    expect(result).toEqual(expectedCategory);
  });

  it('inserts with the correct userId and input data', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null); // no duplicate
    mockPrisma.category.create.mockResolvedValue(prismaCategory);

    await createCategory(USER_ID, { name: 'Food & Dining', icon: 'utensils', color: '#FF5733' });

    expect(mockPrisma.category.create).toHaveBeenCalledWith({
      data: {
        name: 'Food & Dining',
        icon: 'utensils',
        color: '#FF5733',
        userId: USER_ID,
      },
    });
  });

  it('creates a category with only a name (icon and color are optional)', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null); // no duplicate
    mockPrisma.category.create.mockResolvedValue(prismaCategoryMinimal);

    const result = await createCategory(USER_ID, { name: 'Uncategorized' });

    expect(result.name).toBe('Uncategorized');
    expect(result.icon).toBeNull();
    expect(result.color).toBeNull();
    expect(mockPrisma.category.create).toHaveBeenCalledWith({
      data: { name: 'Uncategorized', userId: USER_ID },
    });
  });

  it('always sets userId from the service parameter, not from user-supplied data', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null); // no duplicate
    mockPrisma.category.create.mockResolvedValue(prismaCategory);

    await createCategory(USER_ID, { name: 'Food & Dining' });

    const callArg = mockPrisma.category.create.mock.calls[0][0];
    expect(callArg.data.userId).toBe(USER_ID);
  });

  it('throws ConflictError when creating a category with a duplicate name for the same user', async () => {
    // Service now enforces case-insensitive name uniqueness per user
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory); // existing found

    await expect(createCategory(USER_ID, { name: 'Food & Dining' })).rejects.toThrow(ConflictError);
    expect(mockPrisma.category.create).not.toHaveBeenCalled();
  });

  it('duplicate name check is case-insensitive', async () => {
    // "Food & Dining" already exists, trying to create "FOOD & DINING" should fail
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory); // existing found
    await expect(createCategory(USER_ID, { name: 'FOOD & DINING' })).rejects.toThrow(ConflictError);
  });

  it('allows same category name for different users (no cross-user uniqueness)', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(null); // no duplicate for this user
    mockPrisma.category.create.mockResolvedValue(prismaCategory);
    const result = await createCategory('other-user-id', { name: 'Food & Dining' });
    expect(result).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateCategory
// ─────────────────────────────────────────────────────────────────────────────

describe('updateCategory', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the category and returns the updated CategoryResponse', async () => {
    const updatedPrismaCategory = { ...prismaCategory, name: 'Groceries', updatedAt: UPDATED };
    // findFirst called twice: 1st for duplicate check (returns null), 2nd by getCategory (returns updated row)
    mockPrisma.category.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(updatedPrismaCategory);
    mockPrisma.category.updateMany.mockResolvedValue({ count: 1 });

    const result = await updateCategory(USER_ID, CATEGORY_ID, { name: 'Groceries' });

    expect(result.name).toBe('Groceries');
    expect(result.updatedAt).toBe(UPDATED.toISOString());
  });

  it('calls updateMany with compound { id, userId } for ownership enforcement', async () => {
    // findFirst called twice: 1st for duplicate check (returns null), 2nd by getCategory
    mockPrisma.category.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(prismaCategory);
    mockPrisma.category.updateMany.mockResolvedValue({ count: 1 });

    await updateCategory(USER_ID, CATEGORY_ID, { name: 'Updated' });

    expect(mockPrisma.category.updateMany).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
      data: { name: 'Updated' },
    });
  });

  it('throws NotFoundError when updateMany returns count=0 (category not found or not owned)', async () => {
    // findFirst for duplicate check returns null (no conflict), then updateMany returns 0
    mockPrisma.category.findFirst.mockResolvedValue(null);
    mockPrisma.category.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateCategory(USER_ID, CATEGORY_ID, { name: 'New' })).rejects.toThrow(
      NotFoundError,
    );
    await expect(updateCategory(USER_ID, CATEGORY_ID, { name: 'New' })).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('throws NotFoundError with message "Category not found"', async () => {
    // findFirst for duplicate check returns null (no conflict), then updateMany returns 0
    mockPrisma.category.findFirst.mockResolvedValue(null);
    mockPrisma.category.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateCategory(USER_ID, CATEGORY_ID, { name: 'New' })).rejects.toThrow(
      'Category not found',
    );
  });

  it('does NOT allow a different user to update the category (ownership isolation)', async () => {
    // The compound where { id, userId: OTHER_USER_ID } would yield count=0 from DB
    // findFirst for duplicate check returns null (no conflict), then updateMany returns 0
    mockPrisma.category.findFirst.mockResolvedValue(null);
    mockPrisma.category.updateMany.mockResolvedValue({ count: 0 });

    await expect(updateCategory(OTHER_USER_ID, CATEGORY_ID, { name: 'Hijacked' })).rejects.toThrow(
      NotFoundError,
    );
  });

  it('re-fetches the category after updateMany to build the response', async () => {
    mockPrisma.category.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.category.findFirst.mockResolvedValue({ ...prismaCategory, icon: 'shopping-cart' });

    await updateCategory(USER_ID, CATEGORY_ID, { icon: 'shopping-cart' });

    expect(mockPrisma.category.findFirst).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
    });
  });

  it('can update icon and color fields independently', async () => {
    mockPrisma.category.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.category.findFirst.mockResolvedValue({ ...prismaCategory, color: '#00FF00' });

    const result = await updateCategory(USER_ID, CATEGORY_ID, { color: '#00FF00' });

    expect(mockPrisma.category.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { color: '#00FF00' } }),
    );
    expect(result.color).toBe('#00FF00');
  });

  it('throws ConflictError when updating name to an existing category name', async () => {
    // findFirst for duplicate check finds a collision (different category, same name)
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory); // name collision
    await expect(
      updateCategory(USER_ID, 'cat-uuid-001', { name: 'Existing Name' }),
    ).rejects.toThrow(ConflictError);
    expect(mockPrisma.category.updateMany).not.toHaveBeenCalled();
  });

  it('skips duplicate check when name is not in the update payload', async () => {
    mockPrisma.category.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    await updateCategory(USER_ID, 'cat-uuid-001', { icon: 'new-icon' });
    // findFirst should NOT be called for the duplicate check since name is not being updated
    // (it IS called by getCategory for re-fetch, but the duplicate-check call should be absent)
    // We verify updateMany WAS called — meaning no ConflictError was thrown
    expect(mockPrisma.category.updateMany).toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteCategory
// ─────────────────────────────────────────────────────────────────────────────

describe('deleteCategory', () => {
  const mockPrisma = getMockPrisma();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes the category and returns the deleted CategoryResponse', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.category.deleteMany.mockResolvedValue({ count: 1 });

    const result = await deleteCategory(USER_ID, CATEGORY_ID);

    expect(result).toEqual(expectedCategory);
  });

  it('throws NotFoundError immediately when the category does not exist (ownership check first)', async () => {
    // getCategory (findFirst) returns null — throws NotFoundError before reaching transaction count
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await expect(deleteCategory(USER_ID, CATEGORY_ID)).rejects.toThrow(NotFoundError);
    await expect(deleteCategory(USER_ID, CATEGORY_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
    // transaction.count must NOT be called when category is not found
    expect(mockPrisma.transaction.count).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when the category belongs to a different user (ownership isolation)', async () => {
    // Simulates DB returning null because userId doesn't match
    mockPrisma.category.findFirst.mockResolvedValue(null);

    await expect(deleteCategory(OTHER_USER_ID, CATEGORY_ID)).rejects.toThrow(NotFoundError);
    // No transaction count or delete attempted
    expect(mockPrisma.transaction.count).not.toHaveBeenCalled();
    expect(mockPrisma.category.deleteMany).not.toHaveBeenCalled();
  });

  it('throws ConflictError when the category has associated transactions', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(3);

    await expect(deleteCategory(USER_ID, CATEGORY_ID)).rejects.toThrow(ConflictError);
    await expect(deleteCategory(USER_ID, CATEGORY_ID)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
  });

  it('ConflictError message includes the transaction count', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(5);

    const error = await deleteCategory(USER_ID, CATEGORY_ID).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).toContain('5');
  });

  it('does NOT throw ConflictError when the category has zero transactions', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.category.deleteMany.mockResolvedValue({ count: 1 });

    await expect(deleteCategory(USER_ID, CATEGORY_ID)).resolves.toEqual(expectedCategory);
  });

  it('calls deleteMany with compound { id, userId } for defense-in-depth ownership', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.category.deleteMany.mockResolvedValue({ count: 1 });

    await deleteCategory(USER_ID, CATEGORY_ID);

    expect(mockPrisma.category.deleteMany).toHaveBeenCalledWith({
      where: { id: CATEGORY_ID, userId: USER_ID },
    });
  });

  it('throws NotFoundError when deleteMany returns count=0 (race condition defense)', async () => {
    // Ownership check passes, transaction check passes, but deleteMany finds nothing
    // (e.g., deleted concurrently between the ownership check and the delete)
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.category.deleteMany.mockResolvedValue({ count: 0 });

    await expect(deleteCategory(USER_ID, CATEGORY_ID)).rejects.toThrow(NotFoundError);
    await expect(deleteCategory(USER_ID, CATEGORY_ID)).rejects.toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  });

  it('queries transaction count by categoryId (not userId) to check ALL linked transactions', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(0);
    mockPrisma.category.deleteMany.mockResolvedValue({ count: 1 });

    await deleteCategory(USER_ID, CATEGORY_ID);

    expect(mockPrisma.transaction.count).toHaveBeenCalledWith({
      where: { categoryId: CATEGORY_ID, category: { userId: USER_ID } },
    });
  });

  it('preserves the order of checks: ownership → transaction count → delete', async () => {
    const callOrder: string[] = [];
    mockPrisma.category.findFirst.mockImplementation(async () => {
      callOrder.push('findFirst');
      return prismaCategory;
    });
    mockPrisma.transaction.count.mockImplementation(async () => {
      callOrder.push('txCount');
      return 0;
    });
    mockPrisma.category.deleteMany.mockImplementation(async () => {
      callOrder.push('deleteMany');
      return { count: 1 };
    });

    await deleteCategory(USER_ID, CATEGORY_ID);

    expect(callOrder).toEqual(['findFirst', 'txCount', 'deleteMany']);
  });

  it('ConflictError message instructs user to reassign transactions first', async () => {
    mockPrisma.category.findFirst.mockResolvedValue(prismaCategory);
    mockPrisma.transaction.count.mockResolvedValue(2);

    const error = await deleteCategory(USER_ID, CATEGORY_ID).catch((e) => e);

    expect(error.message).toMatch(/reassign/i);
  });
});
