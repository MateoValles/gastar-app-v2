import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
  RESEND_FROM_EMAIL: z.string().email('RESEND_FROM_EMAIL must be a valid email'),
  FRONTEND_URL: z.string().url('FRONTEND_URL must be a valid URL'),
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const formatted = result.error.format();
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(formatted, null, 2));
  process.exit(1);
}

export const env = Object.freeze(result.data);

export type Env = typeof env;
