// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // eslint-config-expo 57 pulls in eslint-plugin-react-hooks v7, which
    // treats React Compiler heuristics as errors. Keep the same warning
    // level as apps/salon-mobile so data-fetch effects don't fail lint.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]);
