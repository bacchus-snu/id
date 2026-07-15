// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-sequences': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      '@typescript-eslint/array-type': ['error', { default: 'generic' }],
      '@typescript-eslint/no-unused-vars': ['error', { caughtErrors: 'none' }],
    },
  },
);
