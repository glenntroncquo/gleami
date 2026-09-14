#!/usr/bin/env node
/**
 * EAS on-success hook. Native Release maps are uploaded by the
 * `@sentry/react-native/expo` plugin during prebuild when SENTRY_AUTH_TOKEN
 * is present. This hook also uploads a `dist/` export (EAS Update / expo export)
 * when that folder exists.
 */
const { execSync } = require('child_process');
const fs = require('fs');

if (!process.env.SENTRY_AUTH_TOKEN) {
  console.log('SENTRY_AUTH_TOKEN is not set; skipping JS source map upload.');
  process.exit(0);
}

if (!fs.existsSync('dist')) {
  console.log(
    'No dist/ folder. Native source maps are uploaded by the Sentry Expo plugin when SENTRY_AUTH_TOKEN is set.',
  );
  process.exit(0);
}

execSync('npx sentry-expo-upload-sourcemaps dist', { stdio: 'inherit' });
