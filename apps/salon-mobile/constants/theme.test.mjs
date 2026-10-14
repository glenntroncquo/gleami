import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BrandColors, Colors, Design } from './theme.ts';
import { brandColors as marketplaceColors } from '../../marketplace-mobile/src/theme/colors.ts';
import { COLOR_MAP, TREATMENT_COLORS, eventChipColors } from '../lib/treatment-colors.ts';

function luminance(hex) {
  const raw = hex.slice(1);
  const expanded = raw.length === 3 ? [...raw].map((digit) => digit + digit).join('') : raw;
  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function readable(foreground, background, label) {
  const ratio = contrast(foreground, background);
  assert.ok(ratio >= 4.5, `${label}: ${ratio.toFixed(2)}:1, expected at least 4.5:1`);
}

test('both themes expose the same valid semantic color roles', () => {
  assert.deepEqual(Object.keys(Colors.dark).sort(), Object.keys(Colors.light).sort());
  for (const theme of Object.values(Colors)) {
    for (const color of Object.values(theme)) {
      assert.match(color, /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
    }
  }
});

test('dark surfaces convey depth without pure black or blue-gray neutrals', () => {
  const theme = Colors.dark;
  assert.ok(luminance(theme.background) > 0);
  assert.ok(luminance(theme.background) < luminance(theme.card));
  assert.ok(luminance(theme.card) < luminance(theme.surfaceRaised));
  assert.ok(luminance(theme.separator) < luminance(theme.border));
  for (const role of ['background', 'card', 'surface', 'surfaceRaised', 'border', 'separator']) {
    const channels = theme[role].slice(1).match(/../g);
    assert.equal(new Set(channels).size, 1, `${role} should remain neutral`);
  }
});

test('dark text, metadata, and links meet AA on every content surface', () => {
  const theme = Colors.dark;
  for (const surface of ['background', 'card', 'field', 'surface', 'surfaceRaised', 'secondary', 'blueTint']) {
    for (const text of ['text', 'muted', 'icon', 'tint']) {
      readable(theme[text], theme[surface], `${text} on ${surface}`);
    }
  }
});

test('primary actions use the marketplace blue with white text in both modes', () => {
  for (const theme of Object.values(Colors)) {
    assert.equal(theme.primary, BrandColors.blue);
    assert.equal(theme.onPrimary, '#FFFFFF');
  }
  const theme = Colors.dark;
  readable(theme.onTint, theme.tint, 'selected control');
  readable(theme.onDestructive, theme.destructive, 'swipe-to-delete action');
});

test('dark status labels meet AA on their tinted backgrounds', () => {
  const theme = Colors.dark;
  for (const status of ['success', 'warning', 'error']) {
    readable(theme[status], theme[`${status}Surface`], status);
    readable(theme.muted, theme[`${status}Surface`], `${status} metadata`);
  }
  readable(theme.destructive, theme.errorSurface, 'destructive button');
});

test('calendar labels meet AA in both modes and preserve service identity', () => {
  for (const scheme of ['light', 'dark']) {
    for (const color of TREATMENT_COLORS) {
      const chip = eventChipColors(color, scheme);
      readable(chip.text, chip.bg, `${scheme} ${color} event`);
      assert.equal(chip.accent, COLOR_MAP[color]);
    }
  }
});

test('salon and marketplace share the same brand foundation', () => {
  assert.deepEqual(BrandColors, marketplaceColors);
  assert.deepEqual(Design.colors, marketplaceColors);
  const theme = Colors.light;
  assert.equal(theme.background, '#fff');
  assert.equal(theme.card, marketplaceColors.surface);
  assert.equal(theme.surface, marketplaceColors.surface);
  assert.equal(theme.text, marketplaceColors.navy);
  assert.equal(theme.muted, marketplaceColors.muted);
  assert.equal(theme.primary, marketplaceColors.blue);
  assert.equal(theme.blueTint, marketplaceColors.blueTint);
  assert.equal(theme.border, marketplaceColors.line);
  assert.equal(Design.cardRadius, 20);
});

test('field focus and selected tab icons stay visible in both modes', () => {
  for (const theme of Object.values(Colors)) {
    assert.ok(contrast(theme.focus, theme.field) >= 3, 'focus boundary');
    assert.ok(contrast(theme.tabIconSelected, theme.background) >= 3, 'selected tab icon');
  }
});
