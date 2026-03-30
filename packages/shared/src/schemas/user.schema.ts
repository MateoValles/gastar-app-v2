import { z } from 'zod';

/**
 * Schema for updating the authenticated user's profile.
 *
 * All fields are optional, but at least one must be provided.
 * An empty body is rejected at the validation layer (400 Bad Request).
 *
 * - `name`: 1-100 characters
 * - `email`: valid email format
 * - `language`: one of 'es' (Spanish) or 'en' (English)
 */
export const updateUserSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    language: z.enum(['es', 'en']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
