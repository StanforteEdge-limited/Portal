import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * `$app/*` aliases mirror `path-alias-register.cjs` and `tsconfig.json#paths`
 * so specs resolve modules exactly the way `tsx` and the built server do.
 */
export default defineConfig({
  resolve: {
    alias: {
      $app: resolve(__dirname, 'src'),
      $apps: resolve(__dirname, 'src/apps'),
      $core: resolve(__dirname, 'src/core'),
      $plugins: resolve(__dirname, 'src/plugins'),
      $config: resolve(__dirname, 'src/config'),
      '$app/test': resolve(__dirname, 'test'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    setupFiles: ['test/support/setup.ts'],
    hookTimeout: 60_000,
    testTimeout: 30_000,
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
    },
  },
});
