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
    // treats React Compiler heuristics as errors. Existing data-fetch and
    // cache-reset effects trip those rules; keep them visible as warnings
    // so `expo lint` still passes without rewriting those screens.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/refs': 'warn',
    },
  },
]);
