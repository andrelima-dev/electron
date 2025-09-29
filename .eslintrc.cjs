/**
 * ESLint configuration focused on clarity and consistency.
 * - Base: eslint:recommended
 * - Prettier: turns off conflicting formatting rules
 */
module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'script'
  },
  plugins: ['prettier'],
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  rules: {
    // Keep console logs; this is a desktop app where logs are useful
    'no-console': 'off',
    // Surface prettier issues as ESLint errors
    'prettier/prettier': 'error'
  },
  overrides: [
    {
      files: ['src/renderer/**/*.js'],
      env: { browser: true, node: false },
      globals: {
        window: 'readonly',
        document: 'readonly'
      }
    },
    {
      files: ['tests/**/*.js'],
      env: { node: true }
    }
  ]
};
