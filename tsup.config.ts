import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm'],
  experimentalDts: true,
  tsconfig: 'tsconfig.tsup.json',
  splitting: true,
  sourcemap: true,
  clean: true,
});
