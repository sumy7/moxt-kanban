import js from '@eslint/js';
import globals from 'globals';
import ts from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'dist/',
      'src/**/*.svelte',
      'src/**/*.svelte.ts',
    ],
  },
];
