import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_THEME_PREFERENCE, readThemePreference } from './theme-preference.ts';

test('first launch defaults to marketplace light', () => {
  assert.equal(DEFAULT_THEME_PREFERENCE, 'light');
  assert.equal(readThemePreference(null), 'light');
});

test('saved appearance preferences remain intact', () => {
  for (const preference of ['light', 'dark', 'system']) {
    assert.equal(readThemePreference(preference), preference);
  }
});

test('invalid persisted preferences fall back to light', () => {
  for (const value of ['', 'unknown', 'DARK']) {
    assert.equal(readThemePreference(value), 'light');
  }
});
