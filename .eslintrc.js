module.exports = {
  root: true,
  env: {
    node: true,
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    'no-sequences': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
  },
};
