import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayFromRules, dayIssue, desiredSlots, enableDay, emptyDay, nextBlock, upcomingAbsences } from './schedule-draft.ts';

test('one rule is one block', () => {
  const day = dayFromRules([{ id: 'a', start: 9 * 60, end: 17 * 60 }]);
  assert.equal(day.working, true);
  assert.deepEqual(desiredSlots(day), [{ id: 'a', start: 9 * 60, end: 17 * 60 }]);
});

test('two rules stay two blocks', () => {
  const day = dayFromRules([
    { id: 'b', start: 13 * 60, end: 17 * 60 },
    { id: 'a', start: 9 * 60, end: 12 * 60 },
  ]);
  assert.deepEqual(desiredSlots(day).map((slot) => [slot.id, slot.start, slot.end]), [
    ['a', 9 * 60, 12 * 60],
    ['b', 13 * 60, 17 * 60],
  ]);
  assert.equal(dayIssue(day), null);
});

test('overlapping blocks are invalid', () => {
  const day = dayFromRules([
    { id: 'a', start: 9 * 60, end: 14 * 60 },
    { id: 'b', start: 13 * 60, end: 17 * 60 },
  ]);
  assert.equal(dayIssue(day), 'slot');
});

test('a new block is added after the last one', () => {
  const day = dayFromRules([{ id: 'a', start: 9 * 60, end: 17 * 60 }]);
  assert.deepEqual(nextBlock(day.slots), { start: 17 * 60, end: 21 * 60 });
});

test('a packed day gets no extra block', () => {
  const day = dayFromRules([{ id: 'a', start: 7 * 60, end: 22 * 60 }]);
  assert.equal(nextBlock(day.slots), null);
});

test('turning a fresh day on copies an existing block', () => {
  const day = enableDay(emptyDay(), { start: 10 * 60, end: 18 * 60 });
  assert.equal(day.working, true);
  assert.equal(day.slots[0].start, 10 * 60);
  assert.equal(day.slots[0].end, 18 * 60);
});

test('turning a day back on keeps the blocks already set', () => {
  const edited = dayFromRules([{ id: 'a', start: 11 * 60, end: 19 * 60 }]);
  edited.working = false;
  const day = enableDay(edited, { start: 9 * 60, end: 17 * 60 });
  assert.equal(day.slots[0].start, 11 * 60);
  assert.equal(day.slots[0].end, 19 * 60);
});

test('only absences that have not ended yet, soonest first', () => {
  const now = new Date('2026-10-14T12:00:00');
  const rows = upcomingAbsences(
    [
      { id: 'past', starts_at: '2026-10-01T09:00:00', ends_at: '2026-10-01T17:00:00' },
      { id: 'later', starts_at: '2026-10-20T09:00:00', ends_at: '2026-10-20T17:00:00' },
      { id: 'soon', starts_at: '2026-10-16T09:00:00', ends_at: '2026-10-16T12:00:00' },
      { id: 'ongoing', starts_at: '2026-10-14T08:00:00', ends_at: '2026-10-14T18:00:00' },
    ],
    now
  );
  assert.deepEqual(rows.map((row) => row.id), ['ongoing', 'soon', 'later']);
});
