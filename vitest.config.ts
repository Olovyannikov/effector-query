import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // react() enables the automatic JSX runtime in .tsx tests;
  // vue() compiles any Vue SFCs / handles effector-vue interop.
  plugins: [react(), vue()],
  test: {
    // DOM-needing files opt in per-file via `// @vitest-environment happy-dom`;
    // everything else runs in the default node environment.
    environment: 'node',
    include: ['test/**/*.{test,spec}.{ts,tsx}'],
    // effector-vue's ESM does a default-import of `vue`; inlining lets vite
    // apply interop so it loads under vitest.
    server: { deps: { inline: ['effector-vue'] } },
  },
});
