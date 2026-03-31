import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.test.json'] })],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['src/__integration__/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/modules/**/*.service.ts', 'src/modules/**/*.controller.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**'],
    },
  },
});
