/**
 * JWT helpers for integration tests.
 *
 * Reuses the same signing logic as the production auth service to avoid
 * duplicating crypto logic. Valid tokens use the real signing functions.
 * Expired tokens are signed with '0s' expiry using jose directly.
 */
import { SignJWT } from 'jose';
import { authConfig } from '@/config/auth.js';
import { signAccessToken, signRefreshToken } from '@/modules/auth/auth.service.js';

/**
 * Returns a valid access JWT for the given userId.
 * Uses the same signAccessToken as production — real secret, real expiry.
 */
export async function getValidJwt(userId: string): Promise<string> {
  return signAccessToken(userId);
}

/**
 * Returns an already-expired access JWT for the given userId.
 * Sets expiresIn to '0s' so the token is expired at the moment of creation.
 * No time mocking needed.
 */
export async function getExpiredJwt(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer('gastar')
    .setIssuedAt()
    .setExpirationTime('0s')
    .sign(authConfig.accessToken.secret);
}

/**
 * Returns a valid refresh token for the given userId.
 * Uses the same signRefreshToken as production — real secret, real expiry.
 */
export async function getValidRefreshToken(userId: string): Promise<string> {
  return signRefreshToken(userId);
}
