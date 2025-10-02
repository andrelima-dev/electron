
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
    'no-console': 'off',
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
