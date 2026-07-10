const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  globalIgnores(['android/**', 'node_modules/**', '.expo/**', 'coverage/**']),
  expoConfig,
  {
    rules: {
      'no-console': 'error',
      'import/no-named-as-default-member': 'off',
    },
  },
]);
