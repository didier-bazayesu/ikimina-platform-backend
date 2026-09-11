// eslint.config.js
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // application/ must never reach into real persistence/ or pg directly
    files: ['src/application/**/*.ts'],
    ignores: ['src/application/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'pg', message: 'application/ must depend on a repository interface, not pg directly.' }],
        patterns: [{
          group: ['**/persistence/**', '*/persistence/*'],
          message: 'application/ must depend on a repository interface, not persistence/ directly.',
        }],
      }],
    },
  },
  {
    // test files ARE allowed to import *.mock.ts from persistence/ —
    // that's the intended test-double pattern. Still block real pg access.
    files: ['src/application/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'pg', message: 'Tests must use a mock, not a real pg connection.' }],
      }],
    },
  },
  {
    files: ['src/controller/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['**/persistence/**', '*/persistence/*'], message: 'controller/ must never import persistence/ directly.' },
          { group: ['**/*.service'], message: 'controller/ must depend on the *.service.interface.ts, not the concrete service class.' },
        ],
      }],
    },
  },
);