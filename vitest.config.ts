import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
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
