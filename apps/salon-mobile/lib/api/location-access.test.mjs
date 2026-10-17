import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clientFacingBounds, layoutAppointmentSegments } from './appointment-layout.ts';
import { locationsVisibleToUser } from './location-access.ts';

const shop = (id, companyId, name, extra = {}) => ({
  id,
  company_id: companyId,
  name,
  is_active: true,
  is_primary: false,
  ...extra,
});

test('a company owner sees every active location of that company', () => {
  const rows = locationsVisibleToUser({
    locations: [
      shop('a', 'company', 'Alpha'),
      shop('b', 'company', 'Beta', { is_primary: true }),
      shop('c', 'other', 'Other'),
      shop('closed', 'company', 'Closed', { is_active: false }),
    ],
    leaderCompanyIds: ['company'],
    memberLocationIds: [],
  });
  assert.deepEqual(rows.map((row) => row.id), ['b', 'a']);
});

test('a location member does not inherit the rest of the company', () => {
  const rows = locationsVisibleToUser({
    locations: [shop('a', 'company', 'Alpha'), shop('b', 'company', 'Beta')],
    leaderCompanyIds: [],
    memberLocationIds: ['a'],
  });
  assert.deepEqual(rows.map((row) => row.id), ['a']);
});

test('editing keeps the salon clock instead of shifting it', () => {
  const start = new Date(2026, 9, 15, 9, 30, 0);
  const laidOut = layoutAppointmentSegments(start, [
    {
      serviceId: 'service',
      serviceVariantId: 'variant',
      staffId: 'staff',
      price: 40,
      durationMinutes: 60,
      phases: [
        { sequence: 0, phase_type: 'busy', duration_minutes: 30 },
        { sequence: 1, phase_type: 'free', duration_minutes: 15 },
        { sequence: 2, phase_type: 'buffer', duration_minutes: 15 },
      ],
    },
  ]);
  const bounds = clientFacingBounds(laidOut);
  assert.equal(bounds.start.getHours(), 9);
  assert.equal(bounds.start.getMinutes(), 30);
  assert.equal(bounds.end.getHours(), 10);
  assert.equal(bounds.end.getMinutes(), 15);
  assert.equal(laidOut[0].endsAt.getHours(), 10);
  assert.equal(laidOut[0].endsAt.getMinutes(), 30);
});
