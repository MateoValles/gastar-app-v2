import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import type { LoginInput, RegisterInput, UserProfile } from '@gastar/shared';
import { authConfig } from '@/config/auth.js';
import { env } from '@/config/env.js';
import { prisma } from '@/lib/prisma.js';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '@/lib/errors.js';
import { sendPasswordResetEmail } from '@/lib/resend.js';

// ─────────────────────────────────────────────────────────────────────────────
// Default Categories (templates copied to each user on registration)
// Defined here in code — NOT in the database (per ARCHITECTURE.md).
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { name: 'Auto', icon: 'car', color: '#3B82F6' },
  { name: 'Salud', icon: 'heart-pulse', color: '#EF4444' },
  { name: 'Personal', icon: 'user', color: '#8B5CF6' },
  { name: 'Social', icon: 'users', color: '#F59E0B' },
  { name: 'Comida', icon: 'utensils', color: '#10B981' },
  { name: 'Viajes', icon: 'plane', color: '#06B6D4' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Token Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Signs a short-lived access token (15m) for a given userId.
 */
export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('gastar')
    .setIssuedAt()
    .setExpirationTime(authConfig.accessToken.expiresIn)
    .sign(authConfig.accessToken.secret);
}

/**
 * Signs a long-lived refresh token (7d) for a given userId.
 * Includes `type: 'refresh'` claim for defense-in-depth.
 */
export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('gastar')
    .setIssuedAt()
    .setExpirationTime(authConfig.refreshToken.expiresIn)
    .sign(authConfig.refreshToken.secret);
}

/**
 * Generates both access and refresh tokens for a user.
 */
async function generateTokens(
  userId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId),
    signRefreshToken(userId),
  ]);
  return { accessToken, refreshToken };
}

/**
 * Maps a Prisma user row + settings to the UserProfile DTO.
 */
function toUserProfile(
  user: { id: string; email: string; name: string },
  language: string,
): UserProfile {
  return { id: user.id, email: user.email, name: user.name, language };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Methods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registers a new user.
 *
 * Atomically creates: User + UserSettings + 6 default Categories.
 * If any step fails the entire transaction is rolled back.
 *
 * Throws ConflictError if the email is already taken (Prisma P2002 will be
 * caught by the error middleware, but we check for clarity in service tests).
 */
export async function register(
  data: RegisterInput,
): Promise<{ accessToken: string; refreshToken: string; user: UserProfile }> {
  const { email, password, name } = data;

  const passwordHash = await bcrypt.hash(password, authConfig.bcryptSaltRounds);

  const user = await prisma.$transaction(async (tx) => {
    // Check for duplicate email explicitly so we can throw a clear ConflictError
    // (the Prisma P2002 from the unique constraint would also be mapped in error
    // middleware, but throwing here gives a better message in service layer tests).
    const existing = await tx.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const newUser = await tx.user.create({
      data: { email, passwordHash, name },
    });

    await tx.userSettings.create({
      data: { userId: newUser.id, language: 'es' },
    });

    await tx.category.createMany({
      data: DEFAULT_CATEGORIES.map((cat) => ({
        ...cat,
        userId: newUser.id,
      })),
    });

    return newUser;
  });

  const tokens = await generateTokens(user.id);
  const profile = toUserProfile(user, 'es');

  return { ...tokens, user: profile };
}

/**
 * Authenticates a user by email + password.
 * Throws UnauthorizedError if the credentials are invalid.
 */
export async function login(
  data: LoginInput,
): Promise<{ accessToken: string; refreshToken: string; user: UserProfile }> {
  const { email, password } = data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { settings: true },
  });

  // Use a constant-time comparison to prevent timing attacks — always run
  // bcrypt.compare even if user is not found (compare against a dummy hash).
  const dummyHash =
    '$2b$12$invaliddummyhashfortimingneutrality.padding.1234567890';
  const passwordHash = user?.passwordHash ?? dummyHash;
  const isValid = await bcrypt.compare(password, passwordHash);

  if (!user || !isValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await generateTokens(user.id);
  const language = user.settings?.language ?? 'es';
  const profile = toUserProfile(user, language);

  return { ...tokens, user: profile };
}

/**
 * Verifies a refresh token and issues a new access token + rotated refresh token.
 * Throws UnauthorizedError if the token is invalid, expired, or the user no
 * longer exists.
 */
export async function refresh(
  token: string,
): Promise<{ accessToken: string; refreshToken: string; user: UserProfile }> {
  let userId: string;

  try {
    const { payload } = await jwtVerify(token, authConfig.refreshToken.secret, {
      issuer: 'gastar',
    });

    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      payload['type'] !== 'refresh'
    ) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    userId = payload.sub;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;

    if (err instanceof Error && err.message.toLowerCase().includes('expired')) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { settings: true },
  });

  if (!user) {
    throw new UnauthorizedError('User no longer exists');
  }

  const tokens = await generateTokens(user.id);
  const language = user.settings?.language ?? 'es';
  const profile = toUserProfile(user, language);

  return { ...tokens, user: profile };
}

/**
 * Initiates the forgot-password flow.
 *
 * Generates a cryptographically random token, stores its SHA-256 hash in the DB
 * with a 1-hour expiry, and sends a reset email via Resend.
 *
 * If the email is not found, silently returns — NEVER reveal whether an email exists.
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  // Silent return — prevents email enumeration attacks
  if (!user) return;

  const plainToken = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  await prisma.user.update({
    where: { id: user.id },
    data: { resetTokenHash: hash, resetTokenExpiry: expiry },
  });

  await sendPasswordResetEmail(user.email, plainToken, env.FRONTEND_URL);
}

/**
 * Resets a user's password using a plain-text token from the reset email.
 *
 * Hashes the incoming token and looks it up in the DB. Verifies it hasn't expired.
 * On success: updates the password and clears the reset token fields.
 *
 * Throws NotFoundError if the token is invalid or expired.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const hash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await prisma.user.findFirst({
    where: {
      resetTokenHash: hash,
      resetTokenExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw new NotFoundError('Invalid or expired password reset token');
  }

  const passwordHash = await bcrypt.hash(
    newPassword,
    authConfig.bcryptSaltRounds,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetTokenHash: null,
      resetTokenExpiry: null,
    },
  });
}
