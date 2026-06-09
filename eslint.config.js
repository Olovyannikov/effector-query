import effector from 'eslint-plugin-effector';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'docs', 'coverage', 'examples'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { effector },
    rules: {
      ...effector.configs.recommended.rules,
      // the library internals use these deliberately (logger/barrier/client helpers)
      'effector/no-getState': 'off',
      'effector/no-watch': 'off',
    },
  },
);
