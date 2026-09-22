import assert from 'node:assert/strict';
import { test } from 'node:test';
import { layoutTimelineEvents, timelineMinutes } from './timeline-layout.ts';
const date = '2026-09-22';
const event = (id, start, end, canceled = false) => ({ id, startISO: `${date}T${start}:00`, endISO: `${date}T${end}:00`, canceled });

test('back-to-back visits use the full column without overlapping', () => {
  const result = layoutTimelineEvents([event('a', '09:00', '10:00'), event('b', '10:00', '11:00')], date);
  assert.deepEqual(result.map(({ lane, lanes }) => [lane, lanes]), [[0, 1], [0, 1]]);
});
test('connected overlaps share lanes and reuse a lane when a visit ends', () => {
  const result = layoutTimelineEvents([event('a', '09:00', '11:00'), event('b', '09:30', '10:00'), event('c', '10:00', '12:00'), event('d', '13:00', '14:00')], date);
  assert.deepEqual(result.map(({ lane, lanes }) => [lane, lanes]), [[0, 2], [1, 2], [1, 2], [0, 1]]);
});
test('canceled and invalid visits do not occupy time', () => {
  assert.deepEqual(layoutTimelineEvents([event('a', '09:00', '10:00', true), event('b', '11:00', '10:00')], date), []);
});
test('overnight visits clip at each day boundary', () => {
  const visit = { id: 'overnight', startISO: '2026-09-21T23:30:00', endISO: '2026-09-22T00:30:00', canceled: false };
  assert.equal(layoutTimelineEvents([visit], date)[0].start, 0);
  assert.equal(layoutTimelineEvents([visit], date)[0].end, 30);
  assert.equal(layoutTimelineEvents([visit], '2026-09-21')[0].end, 1440);
});
test('salon wall-clock spacing stays stable across DST and month boundaries', () => {
  assert.equal(timelineMinutes('2026-10-25T03:30:00', '2026-10-25'), 210);
  assert.equal(timelineMinutes('2026-10-01T00:30:00', '2026-09-30'), 1470);
});
