import { z } from 'zod';

/**
 * Schema for creating a new category.
 *
 * `icon` is an optional Lucide icon name — stored as-is, no backend enum validation
 * because the icon set changes frequently and validation is the frontend's concern.
 *
 * `color` is optional and must be a valid 6-digit hex color (e.g. "#3B82F6").
 * Short-form hex ("#F00") and named colors ("red") are rejected.
 */
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().min(1).max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color (e.g. "#3B82F6")')
    .optional(),
});

/**
 * Schema for updating an existing category.
 *
 * All fields are optional but at least one must be provided.
 */
export const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    icon: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a hex color (e.g. "#3B82F6")')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
