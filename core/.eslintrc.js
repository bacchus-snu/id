module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-extra-semi': 'error',
    'no-sequences': 'error',
    quotes: ['error', 'single'],
    'sort-keys': 'off',
    'sort-imports': 'off',
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    'arrow-parens': ['error', 'as-needed'],
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        filter: {
          regex: '^oauth_',
          match: false,
        },
        format: ['camelCase'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'typeProperty',
        format: ['camelCase', 'snake_case'],
      },
      {
        selector: 'classProperty',
        format: ['camelCase', 'UPPER_CASE']
      }
    ],
    'no-constant-condition' : ['error', { checkLoops: false }],
  },
};
