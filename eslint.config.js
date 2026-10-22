import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
  {
    files: ['src/**/*.ts', 'public/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['src/core/**/*.ts'],
    languageOptions: { globals: { window: 'off', document: 'off' } },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            'three',
            'three/**',
            '**/render/**',
            '**/ui/**',
            '**/app/**',
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'requestAnimationFrame',
      ],
    },
  },
  {
    files: ['src/render/**/*.ts', 'src/ui/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['**/app/**'] }] },
  },
);
