import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  // Neon Postgres connection string — used for every environment
  // (dev, test, CI, prod). Standard pg.Pool connection, not the
  // @neondatabase/serverless HTTP driver — see database-connection.ts
  // for why (multi-statement transactions / row locking).
  DATABASE_URL: z.string().url(),
  DB_MAX_CONNECTIONS: z.coerce.number().default(10),

  // JWT — IKM-1.3 (login, signing) and IKM-1.4 (guard, verification)
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const validateEnv = (config: Record<string, unknown>): EnvConfig => {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment variables validation failure.');
  }

  return result.data;
};
