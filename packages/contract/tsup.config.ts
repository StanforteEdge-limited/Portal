import { defineConfig } from 'tsup';

// Emits both ESM (.js) and CJS (.cjs) plus matching declarations, because
// consumers are split across a Vite/ESM browser bundle and a CommonJS Node
// server (`apps/api-fastify` runs `node dist/server.js`).
export default defineConfig({
  entry: ['src/**/*.ts'],
  outDir: 'dist',
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2021',
  splitting: false,
  treeshake: true,
});
