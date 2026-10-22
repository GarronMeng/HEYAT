import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './',
  server: { allowedHosts: ['terminal.local'] },
  preview: { allowedHosts: ['terminal.local'] },
  build: { sourcemap: true },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});
