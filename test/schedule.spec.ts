import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DateTime } from 'luxon';
import { availableTimes, businessDate } from '../src/booking/schedule';
import { validatePassword } from '../src/auth/password';

const now = DateTime.fromISO('2026-10-24T10:00:00', { zone: 'Europe/London' });
const date = businessDate('2026-10-27', 'Europe/London', now);
const schedule = { '2': [570, 1170] as const };

test('generates timezone-aware slots and excludes overlaps across different service durations', () => {
  const times = availableTimes(date, schedule, 105, [{ start: 630, end: 690 }], now);
  assert.ok(!times.includes('09:30'));
  assert.ok(!times.includes('10:30'));
  assert.ok(times.includes('11:30'));
  assert.ok(!times.includes('18:00'));
});

test('rejects invalid, past and too-distant dates and returns no slots on closed days', () => {
  for (const value of ['2026-02-30', '2026-10-23', '2027-10-24', 'invalid']) {
    assert.throws(() => businessDate(value, 'Europe/London', now));
  }
  assert.deepEqual(availableTimes(date.plus({ days: 6 }), schedule, 60, [], now), []);
});

test('rejects bcrypt password truncation including multibyte strings', () => {
  assert.throws(() => validatePassword('short'));
  assert.throws(() => validatePassword('a'.repeat(73)));
  assert.throws(() => validatePassword('\u00e9'.repeat(37)));
  assert.doesNotThrow(() => validatePassword('a-strong-password-123'));
});