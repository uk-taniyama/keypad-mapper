import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['src/tests/vitest.setup.ts'],
    coverage: {
      reporter: ['json', 'html'],
      all: true,
      reportOnFailure: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/tests/**/*',
        'src/example/**/*',
        'src/**/*.spec.ts',
      ],
    },
  },
});
