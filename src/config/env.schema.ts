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
