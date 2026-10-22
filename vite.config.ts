import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  build: { sourcemap: true },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
