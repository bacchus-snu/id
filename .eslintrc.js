module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'semi': 'off',
    '@typescript-eslint/semi': ['error', 'never'],
    'no-sequences': 'error',
    quotes: ['error', 'single'],
    'sort-keys': 'off',
    'sort-imports': 'off',
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    'arrow-parens': ['error', 'as-needed'],
    '@typescript-eslint/naming-convention': 'off',
    'no-constant-condition' : ['error', { checkLoops: false }],
  },
}
