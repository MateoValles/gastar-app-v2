import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.test.json'] })],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__integration__/**/*.integration.test.ts'],
    setupFiles: ['./src/__integration__/setup-env.ts'],
    globalSetup: ['./src/__integration__/global-setup.ts'],
    pool: 'forks',
    maxWorkers: 1,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
