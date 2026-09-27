import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    // Unit tests only — excludes *.integration-test.ts
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: false,
    // vmForks pool lets Vitest handle TypeScript via Vite's internal
    // transformer without requiring the package to declare "type":"module".
    // This is the standard approach for NestJS (CJS) projects using Vitest.
    pool: 'vmForks',
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.integration-test.ts',
        'src/**/*.mock.ts',
        'src/**/*.interface.ts',
        'src/**/*.tokens.ts',
        'src/main.ts',
      ],
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      // Mirror the tsconfig baseUrl so 'src/...' absolute imports resolve
      src: resolve(__dirname, 'src'),
    },
  },
});
