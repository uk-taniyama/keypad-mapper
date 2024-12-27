import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['src/tests/vitest.setup.ts'],
    reporters: [
      'default',
      'html',
      'json',
      'junit',
    ],
    outputFile: {
      html: './output/reports/index.html',
      junit: './output/reports/junit-report.xml',
      json: './output/reports/json-report.json',
    },
    coverage: {
      reporter: ['json', 'html'],
      reportsDirectory: './output/coverage/',
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
