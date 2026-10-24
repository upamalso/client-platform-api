import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTenants } from '../src/config';

const valid = { id: 'studio-a', database: 'salon_studio_a', name: 'Studio A',
  timezone: 'Europe/London', profile: 'salon', origins: ['http://localhost:4200'] };

test('accepts and freezes operator configured tenants', () => {
  const [tenant] = parseTenants([valid]);
  assert.equal(tenant.database, 'salon_studio_a');
  assert.ok(Object.isFrozen(tenant));
  assert.ok(Object.isFrozen(tenant.origins));
});

test('rejects arbitrary database names, injection, duplicates and invalid origins', () => {
  for (const database of ['mysql', 'salon_a; DROP DATABASE mysql', '../salon_a']) {
    assert.throws(() => parseTenants([{ ...valid, database }]));
  }
  assert.throws(() => parseTenants([valid, valid]));
  assert.throws(() => parseTenants([{ ...valid, origins: ['https://example.com/path'] }]));
  assert.throws(() => parseTenants([{ ...valid, timezone: 'Unknown/Zone' }]));
  assert.throws(() => parseTenants([{ ...valid, profile: '../arbitrary-migrations' }]));
});