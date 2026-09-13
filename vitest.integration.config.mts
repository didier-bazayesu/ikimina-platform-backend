import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Integration tests only — require a real DATABASE_URL in .env
    include: ['src/**/*.integration-test.ts'],
    environment: 'node',
    globals: false,
    pool: 'vmForks',
    setupFiles: ['./vitest.integration.setup.ts'],
    testTimeout: 30_000, // Network round-trips to Neon can be slow
    reporters: ['verbose'],
  },
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),
    },
  },
});
