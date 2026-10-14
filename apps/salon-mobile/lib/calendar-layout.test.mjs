import assert from 'node:assert/strict';
import { test } from 'node:test';

import { calendarPreviewLayout, monthPagerLayout } from './calendar-layout.ts';

const months = [-2, -1, 0, 1, 2];

test('the month pager waits for both native layout measurements', () => {
  assert.equal(monthPagerLayout(0, 600, months, 0), null);
  assert.equal(monthPagerLayout(350, 0, months, 0), null);
  assert.equal(monthPagerLayout(NaN, 600, months, 0), null);
  assert.equal(monthPagerLayout(350, Infinity, months, 0), null);
  assert.equal(monthPagerLayout(-1, 600, months, 0), null);
});

test('first open uses the measured viewport for both pages and initial offset', () => {
  const measuredWidth = 390 - 2 * 20;
  const pager = monthPagerLayout(measuredWidth, 600, months, 0);
  assert.equal(pager.initialScrollIndex, 2);
  assert.deepEqual(pager.getItemLayout(null, pager.initialScrollIndex), {
    length: 350, offset: 700, index: 2,
  });
  // The old 32pt padding estimate put the first visible page 16pt off-center.
  assert.equal((390 - 32) * 2 - pager.getItemLayout(null, 2).offset, 16);
});

test('resizing remounts the pager on the selected month, not today', () => {
  const before = monthPagerLayout(350, 600, months, 1);
  const after = monthPagerLayout(804, 320, months, 1);
  assert.notEqual(before.key, after.key);
  assert.equal(after.initialScrollIndex, 3);
  assert.equal(after.getItemLayout(null, 3).offset, 804 * 3);
});

test('height-only safe-area changes keep the pager mounted', () => {
  const before = monthPagerLayout(350, 600, months, 1);
  const after = monthPagerLayout(350, 570, months, 1);
  assert.equal(before.key, after.key);
  assert.equal(after.initialScrollIndex, before.initialScrollIndex);
});

test('prepending months and recentering preserve the selected month', () => {
  const expanded = [-5, -4, -3, ...months];
  assert.equal(monthPagerLayout(350, 600, expanded, -1).initialScrollIndex, 4);
  assert.equal(monthPagerLayout(350, 600, [8, 9, 10, 11, 12], 10).initialScrollIndex, 2);
  assert.equal(monthPagerLayout(350, 600, months, 10), null);
});

test('five- and six-week grids reserve room for overflow and scaled labels', () => {
  for (const weeks of [5, 6]) {
    for (const scale of [1, 1.5, 2]) {
      const rowHeight = 570 / weeks;
      const preview = calendarPreviewLayout(rowHeight, scale, 20);
      assert.equal(preview.visibleCount + preview.hiddenCount, 20);
      assert.equal(preview.showMore, true);
      const slots = preview.visibleCount + 1;
      const used = 8 + preview.headerHeight + 3 + slots * preview.pillHeight + (slots - 1) * 4;
      assert.ok(used <= rowHeight, 'previews must not overflow the week');
    }
  }
});
