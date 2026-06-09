import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Library build. Two entry points:
 *   - effector-query        -> dist/index.{mjs,cjs}
 *   - effector-query/react  -> dist/react.{mjs,cjs}
 * Peer deps are left external so consumers dedupe their own copies.
 */
export default defineConfig({
  build: {
    target: 'es2020',
    sourcemap: true,
    lib: {
      entry: {
        index: 'src/index.ts',
        react: 'src/react.ts',
        vue: 'src/vue.ts',
        solid: 'src/solid.ts',
        devtools: 'src/devtools.tsx',
        'devtools-vue': 'src/devtools-vue.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entry) => `${entry}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: [
        'effector',
        'effector-react',
        'effector-vue',
        'effector-vue/composition',
        'effector-solid',
        'react',
        'react-dom',
        'vue',
        'solid-js',
      ],
    },
  },
  plugins: [dts({ include: ['src'], rollupTypes: false })],
});
