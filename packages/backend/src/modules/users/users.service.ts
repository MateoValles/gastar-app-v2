import type { UserProfile } from '@gastar/shared';
import type { UpdateUserInput } from '@gastar/shared';
import { prisma } from '@/lib/prisma.js';
import { ConflictError, NotFoundError } from '@/lib/errors.js';

/**
 * Users Service
 *
 * Exposes `getMe` and `updateMe` — both scoped to the authenticated user only.
 * No admin access, no /:id routes per architecture (< 10 users, personal app).
 *
 * Update atomicity:
 *   - Only user fields (name/email) → simple `user.update`
 *   - Only settings fields (language) → `userSettings.upsert`
 *   - Both → `prisma.$transaction([user.update, userSettings.upsert])`
 */

// ─────────────────────────────────────────────────────────────────────────────
// Response Mapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps a Prisma User row (with included settings) to the UserProfile DTO.
 * Defaults `language` to 'es' if settings are null (edge case: interrupted registration).
 */
function toUserProfile(user: {
  id: string;
  email: string;
  name: string;
  settings: { language: string } | null;
}): UserProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    language: user.settings?.language ?? 'es',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the authenticated user's profile.
 * Throws `NotFoundError` if the user does not exist (e.g. JWT for deleted account).
 */
export async function getMe(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findFirst({
    where: { id: userId },
    include: { settings: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return toUserProfile(user);
}

/**
 * Updates the authenticated user's profile fields.
 *
 * Splits `data` into:
 *   - `userFields`: name and/or email → written to the `User` table
 *   - `settingsFields`: language → written to the `UserSettings` table via upsert
 *
 * If email is changing, performs an explicit pre-check for conflicts — throws
 * `ConflictError(409)` if the email is already registered by another account.
 *
 * Uses `prisma.$transaction` only when both tables need updating to ensure atomicity.
 */
export async function updateMe(
  userId: string,
  data: UpdateUserInput,
): Promise<UserProfile> {
  // Early existence check — a deleted user with a still-valid JWT must get 404,
  // not a misleading P2003 → 409 when only settings fields are sent.
  const currentUser = await prisma.user.findFirst({ where: { id: userId } });
  if (!currentUser) {
    throw new NotFoundError('User not found');
  }

  const { name, email, language } = data;

  // Split into table-specific field sets
  const userFields: { name?: string; email?: string } = {};
  if (name !== undefined) userFields.name = name;
  if (email !== undefined) userFields.email = email;

  const settingsFields: { language?: string } = {};
  if (language !== undefined) settingsFields.language = language;

  const hasUserFields = Object.keys(userFields).length > 0;
  const hasSettingsFields = Object.keys(settingsFields).length > 0;

  // Email uniqueness check — explicit pre-check (not relying on P2002)
  if (email !== undefined) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      throw new ConflictError('An account with this email already exists');
    }
  }

  if (hasUserFields && hasSettingsFields) {
    // Both tables need updating — use transaction for atomicity
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: userFields,
      }),
      prisma.userSettings.upsert({
        where: { userId },
        update: settingsFields,
        create: { userId, ...settingsFields },
      }),
    ]);
  } else if (hasUserFields) {
    // Only User table
    await prisma.user.update({
      where: { id: userId },
      data: userFields,
    });
  } else {
    // Only UserSettings table
    await prisma.userSettings.upsert({
      where: { userId },
      update: settingsFields,
      create: { userId, ...settingsFields },
    });
  }

  // Re-fetch with settings included to build the response
  const updated = await prisma.user.findFirst({
    where: { id: userId },
    include: { settings: true },
  });

  // After a successful update, the user must exist — this is a safety guard
  if (!updated) {
    throw new NotFoundError('User not found');
  }

  return toUserProfile(updated);
}
