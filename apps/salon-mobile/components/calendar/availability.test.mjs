import assert from 'node:assert/strict';
import { test } from 'node:test';
import { unavailableIntervals } from './availability.ts';
const rule = (staff_id, start_time, end_time, extra = {}) => ({ staff_id, day_of_week: 2, start_time, end_time, effective_from: null, effective_to: null, ...extra });
const date = '2026-09-22';
const gaps = (rules, exceptions = [], ids = ['a']) => unavailableIntervals({ rules, exceptions }, ids, date, 480, 1320);
test('working hours leave mornings, breaks, and evenings gray through 22:00', () => {
  assert.deepEqual(gaps([rule('a', '09:00', '12:00'), rule('a', '13:00', '18:00')]), [{ start: 480, end: 540 }, { start: 720, end: 780 }, { start: 1080, end: 1320 }]);
});
test('time off overrides added availability', () => {
  assert.deepEqual(gaps([], [
    { staff_id: 'a', kind: 'available_addition', starts_at: date + 'T09:00:00', ends_at: date + 'T18:00:00' },
    { staff_id: 'a', kind: 'unavailable', starts_at: date + 'T12:00:00', ends_at: date + 'T13:00:00' },
  ]), [{ start: 480, end: 540 }, { start: 720, end: 780 }, { start: 1080, end: 1320 }]);
});
test('all-staff uses combined availability', () => {
  assert.deepEqual(gaps([rule('a', '08:00', '12:00'), rule('b', '12:00', '22:00')], [], ['a', 'b']), []);
});
test('expired schedules and unscheduled days are unavailable', () => {
  assert.deepEqual(gaps([rule('a', '08:00', '22:00', { effective_to: '2026-09-21' })]), [{ start: 480, end: 1320 }]);
});
test('multi-day absence blocks the entire day', () => {
  assert.deepEqual(gaps([rule('a', '08:00', '22:00')], [{ staff_id: 'a', kind: 'unavailable', starts_at: '2026-09-21T15:00:00', ends_at: '2026-09-23T10:00:00' }]), [{ start: 480, end: 1320 }]);
});
