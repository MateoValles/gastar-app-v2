import { env } from './env.js';

export const authConfig = {
  accessToken: {
    secret: new TextEncoder().encode(env.JWT_ACCESS_SECRET),
    expiresIn: '15m' as const,
    lifetimeMs: 15 * 60 * 1000,
  },
  refreshToken: {
    secret: new TextEncoder().encode(env.JWT_REFRESH_SECRET),
    expiresIn: '7d' as const,
    lifetimeMs: 7 * 24 * 60 * 60 * 1000,
  },
  bcryptSaltRounds: 12,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },
} as const;
