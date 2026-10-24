import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { AddressInfo } from 'node:net';
import { createConnection, RowDataPacket } from 'mysql2/promise';
import { DateTime } from 'luxon';
import { createApp } from '../src/bootstrap';
import { loadConfig, parseTenants } from '../src/config';
import { DatabaseService } from '../src/database/database.service';
import { migrateTenant } from '../src/database/migrate';
import { seedTenant } from '../src/database/seeds';
import { hashPassword } from '../src/auth/password';

test('real MySQL API: authentication, tenant isolation and booking concurrency', { timeout: 120_000 }, async context => {
  const base = loadConfig();
  assert.equal(base.production, false, 'Integration tests require development configuration');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  const tenants = parseTenants([
    { id: 'test-alpha', database: `salon_test_${suffix}_a`, name: 'Test A', profile: 'salon', timezone: 'Europe/London', origins: ['http://localhost:4200'] },
    { id: 'test-beta', database: `salon_test_${suffix}_b`, name: 'Test B', profile: 'salon', timezone: 'Europe/London', origins: ['http://localhost:4322'] },
  ]);
  const config = { ...base, tenants };
  const database = new DatabaseService(config);
  const admin = await createConnection({ host: base.host, port: base.dbPort, user: base.user, password: base.password });
  const created: string[] = [];
  let app: Awaited<ReturnType<typeof createApp>> | undefined;
  try {
    for (const tenant of tenants) {
      const [existing] = await admin.execute<RowDataPacket[]>('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?', [tenant.database]);
      assert.equal(existing.length, 0, 'Never reuse or delete an existing database');
      await migrateTenant(config, tenant);
      created.push(tenant.database);
      await seedTenant(database.pool(tenant), tenant);
    }
    const password = `${randomUUID()}A!`;
    const ownerIds = [randomUUID(), randomUUID()];
    for (const [index, tenant] of tenants.entries()) {
      await database.pool(tenant).execute("INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'OWNER')",
        [ownerIds[index], 'owner@example.com', await hashPassword(password)]);
    }
    app = await createApp(config, false);
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/api/v1`;
    const call = (path: string, options: { tenant?: number; method?: string; body?: unknown; headers?: Record<string, string>; noTenant?: boolean } = {}) => {
      const tenant = tenants[options.tenant ?? 0];
      return fetch(url + path, {
        method: options.method ?? 'GET',
        headers: { ...(options.noTenant ? {} : { 'X-Tenant-ID': tenant.id }),
          Origin: tenant.origins[0], ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    };
    const login = async (tenant: number, email = 'owner@example.com') => {
      const response = await call('/auth/login', { tenant, method: 'POST', body: { email, password } });
      assert.equal(response.status, 200);
      const cookie = response.headers.get('set-cookie')!;
      assert.match(cookie, /HttpOnly/i);
      assert.match(cookie, /SameSite=Lax/i);
      const body = await response.json() as { user: { role: string }; csrfToken: string; token?: string };
      assert.equal(body.token, undefined);
      return { cookie: cookie.split(';')[0], csrf: body.csrfToken, role: body.user.role };
    };
    let ownerA: Awaited<ReturnType<typeof login>>;
    let ownerB: Awaited<ReturnType<typeof login>>;
    let appointmentA = '';
    let appointmentB = '';
    let date = DateTime.now().setZone('Europe/London').plus({ days: 7 }).startOf('day');
    while (date.weekday !== 2) date = date.plus({ days: 1 });
    const booking = { serviceId: 'classic-full', date: date.toISODate()!, time: '10:30',
      firstName: 'Test', lastName: 'Guest', email: 'guest@example.com', phone: '02079460000', newClient: true, notes: '' };
    context.beforeEach(async () => {
      for (const tenant of tenants) await database.pool(tenant).execute('DELETE FROM rate_limits');
    });

    await context.test('readiness and public pages need no account; unknown tenants/origins are denied', async () => {
      assert.equal((await call('/health', { noTenant: true })).status, 200);
      assert.equal((await call('/public/business')).status, 200);
      assert.equal((await call('/public/business', { noTenant: true })).status, 404);
      assert.equal((await call('/public/business', { headers: { 'X-Tenant-ID': 'salon_mysql;--' } })).status, 404);
      assert.equal((await call('/public/business', { tenant: 1, headers: { Origin: tenants[0].origins[0] } })).status, 403);
      assert.equal((await call('/owner/appointments')).status, 401);
      assert.equal((await call('/public/appointments')).status, 404);
      const malformed = await fetch(url + '/public/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenants[0].id, Origin: tenants[0].origins[0] }, body: '{invalid',
      });
      assert.equal(malformed.status, 400);
      const oversized = await fetch(url + '/public/appointments', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': tenants[0].id, Origin: tenants[0].origins[0] }, body: JSON.stringify({ notes: 'x'.repeat(20_000) }),
      });
      assert.equal(oversized.status, 413);
    });

    await context.test('passwords are hashed and public registration cannot create owners', async () => {
      const [users] = await database.pool(tenants[0]).query<RowDataPacket[]>('SELECT password_hash FROM users');
      assert.notEqual(users[0].password_hash, password);
      assert.match(users[0].password_hash as string, /^\$2[ab]\$12\$/);
      assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Sample Guest', email: 'bad@example.com', password, role: 'OWNER' } })).status, 400);
      assert.equal((await call('/auth/register', { method: 'POST', body: { email: 'customer@example.com', password } })).status, 400);
      assert.equal((await call('/auth/register', { method: 'POST', body: { name: ' ', email: 'blank@example.com', password } })).status, 400);
      assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Sample Guest', email: 'customer@example.com', password } })).status, 201);
      const customer = await login(0, 'customer@example.com');
      assert.equal(customer.role, 'CUSTOMER');
      assert.equal((await call('/owner/appointments', { headers: { Cookie: customer.cookie } })).status, 403);
      assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'owner@example.com', password: 'wrong-password-long' } })).status, 401);
      assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Sample Guest', email: 'unicode@example.com', password: '\u00e9'.repeat(37) } })).status, 400);
    });

    await context.test('registration requires Name, Email and Password with valid values', async () => {
      const invalid = [
        { name: 'Sample Customer', email: 'missing-password@example.com' },
        { name: 'Sample Customer', password },
        { email: 'missing-name@example.com', password },
        { name: 'Sample Customer', email: 'not-an-email', password },
        { name: 'Sample Customer', email: 'weak@example.com', password: 'short' },
      ];
      for (const body of invalid) assert.equal((await call('/auth/register', { method: 'POST', body })).status, 400);
    });

    await context.test('owner sessions are tenant-bound and tampered cookies fail', async () => {
      ownerA = await login(0); ownerB = await login(1);
      assert.equal((await call('/owner/appointments', { headers: { Cookie: ownerA.cookie } })).status, 200);
      assert.equal((await call('/owner/appointments', { tenant: 1, headers: { Cookie: ownerA.cookie.replace('test-alpha', 'test-beta') } })).status, 401);
      assert.equal((await call('/auth/me', { headers: { Cookie: 'session_test-alpha=not-a-valid-token' } })).status, 401);
      const me = await call('/auth/me', { headers: { Cookie: ownerA.cookie } });
      assert.equal((await me.json() as { tenantId: string }).tenantId, tenants[0].id);
    });

    await context.test('guest booking is idempotent and isolated between business schemas', async () => {
      const key = randomUUID();
      const first = await call('/public/appointments', { method: 'POST', body: booking, headers: { 'Idempotency-Key': key } });
      assert.equal(first.status, 201);
      const saved = await first.json() as { id: string; email?: string; reference: string };
      appointmentA = saved.id;
      assert.equal(saved.email, undefined);
      const retry = await call('/public/appointments', { method: 'POST', body: booking, headers: { 'Idempotency-Key': key } });
      assert.equal(retry.status, 201);
      assert.equal((await retry.json() as { id: string }).id, saved.id);
      assert.equal((await call('/public/appointments', { method: 'POST', body: { ...booking, firstName: 'Changed' }, headers: { 'Idempotency-Key': key } })).status, 409);
      const other = await call('/public/appointments', { tenant: 1, method: 'POST', body: booking, headers: { 'Idempotency-Key': randomUUID() } });
      assert.equal(other.status, 201);
      appointmentB = (await other.json() as { id: string }).id;
      const list = await call('/owner/appointments', { headers: { Cookie: ownerA.cookie } });
      const items = (await list.json() as { items: { id: string; email: string }[] }).items;
      assert.deepEqual(items.map(item => item.id), [appointmentA]);
      assert.equal(items[0].email, booking.email);
      const otherList = await call('/owner/appointments', { tenant: 1, headers: { Cookie: ownerB.cookie } });
      assert.deepEqual((await otherList.json() as { items: { id: string }[] }).items.map(item => item.id), [appointmentB]);
    });

    await context.test('concurrent different services cannot overlap on the same resource', async () => {
      const responses = await Promise.all([
        call('/public/appointments', { method: 'POST', body: { ...booking, time: '13:30' }, headers: { 'Idempotency-Key': randomUUID() } }),
        call('/public/appointments', { method: 'POST', body: { ...booking, time: '14:00', serviceId: 'hybrid-full' }, headers: { 'Idempotency-Key': randomUUID() } }),
      ]);
      assert.deepEqual(responses.map(response => response.status).sort(), [201, 409]);
      const availability = await call(`/public/availability?serviceId=classic-full&date=${booking.date}`);
      assert.ok(!(await availability.json() as { times: string[] }).times.includes('10:30'));
    });

    await context.test('rejects invalid slots, dates, fields and missing idempotency', async () => {
      const post = (body: unknown) => call('/public/appointments', { method: 'POST', body, headers: { 'Idempotency-Key': randomUUID() } });
      assert.equal((await post({ ...booking, time: '22:00' })).status, 400);
      assert.equal((await post({ ...booking, date: '2020-01-01' })).status, 400);
      assert.equal((await post({ ...booking, date: '2026-02-30' })).status, 400);
      assert.equal((await post({ ...booking, role: 'OWNER' })).status, 400);
      assert.equal((await post({ ...booking, price: 0 })).status, 400);
      assert.equal((await post({ ...booking, notes: 'x'.repeat(1001) })).status, 400);
      assert.equal((await post({ ...booking, serviceId: 'unknown' })).status, 404);
      assert.equal((await call('/public/appointments', { method: 'POST', body: booking })).status, 400);
    });

    await context.test('CSRF, tenant resource authorization and cancellation transitions are enforced', async () => {
      const path = `/owner/appointments/${appointmentA}/status`;
      assert.equal((await call(path, { method: 'PATCH', body: { status: 'cancelled' }, headers: { Cookie: ownerA.cookie } })).status, 403);
      assert.equal((await call(path, { method: 'PATCH', body: { status: 'cancelled' }, headers: { Cookie: ownerA.cookie, 'X-CSRF-Token': '\u00e9'.repeat(64) } })).status, 403);
      assert.equal((await call(`/owner/appointments/${appointmentB}/status`, { method: 'PATCH', body: { status: 'cancelled' }, headers: { Cookie: ownerA.cookie, 'X-CSRF-Token': ownerA.csrf } })).status, 404);
      assert.equal((await call(path, { method: 'PATCH', body: { status: 'cancelled' }, headers: { Cookie: ownerA.cookie, 'X-CSRF-Token': ownerA.csrf } })).status, 200);
      assert.equal((await call(path, { method: 'PATCH', body: { status: 'completed' }, headers: { Cookie: ownerA.cookie, 'X-CSRF-Token': ownerA.csrf } })).status, 409);
      const available = await call(`/public/availability?serviceId=classic-full&date=${booking.date}`);
      assert.ok((await available.json() as { times: string[] }).times.includes('10:30'));
    });

    await context.test('customers register with names, book while signed in and see only their own past/upcoming bookings', async () => {
      const customer = await login(0, 'customer@example.com');
      const headers = { Cookie: customer.cookie, 'X-CSRF-Token': customer.csrf };
      const me = await call('/auth/me', { headers });
      assert.equal((await me.json() as { user: { name: string } }).user.name, 'Sample Guest');
      const empty = await call('/customer/appointments', { headers });
      assert.deepEqual((await empty.json() as { items: unknown[] }).items, []);
      const input = { ...booking, time: '17:00', email: 'guest@example.com' };
      assert.equal((await call('/customer/appointments', { method: 'POST', body: input,
        headers: { Cookie: customer.cookie, 'Idempotency-Key': randomUUID() } })).status, 403);
      const key = randomUUID();
      const response = await call('/customer/appointments', { method: 'POST', body: input,
        headers: { ...headers, 'Idempotency-Key': key } });
      assert.equal(response.status, 201);
      const saved = await response.json() as { id: string };
      const replay = await call('/customer/appointments', { method: 'POST', body: input,
        headers: { ...headers, 'Idempotency-Key': key } });
      assert.equal((await replay.json() as { id: string }).id, saved.id);
      const upcoming = await call('/customer/appointments?period=upcoming', { headers });
      assert.deepEqual((await upcoming.json() as { items: { id: string }[] }).items.map(item => item.id), [saved.id]);
      assert.equal((await call('/customer/appointments?customerId=someone-else', { headers })).status, 400);
      assert.equal((await call('/customer/appointments')).status, 401);
      assert.equal((await call('/customer/appointments', { headers: { Cookie: ownerA.cookie } })).status, 403);
      assert.equal((await call('/customer/appointments', { tenant: 1,
        headers: { Cookie: customer.cookie.replace('test-alpha', 'test-beta') } })).status, 401);
      assert.equal((await call('/auth/register', { method: 'POST', body: { name: 'Other Customer', email: 'other@example.com', password } })).status, 201);
      const other = await login(0, 'other@example.com');
      const otherList = await call('/customer/appointments', { headers: { Cookie: other.cookie } });
      assert.deepEqual((await otherList.json() as { items: unknown[] }).items, []);
      assert.equal((await call('/customer/appointments', { method: 'POST', body: input,
        headers: { Cookie: other.cookie, 'X-CSRF-Token': other.csrf, 'Idempotency-Key': key } })).status, 409);
      assert.equal((await call('/public/appointments', { method: 'POST', body: input,
        headers: { 'Idempotency-Key': key } })).status, 409);
      const yesterday = DateTime.now().setZone(tenants[0].timezone).minus({ days: 1 }).toISODate();
      await database.pool(tenants[0]).execute('UPDATE appointments SET booking_date = ? WHERE id = ?', [yesterday, saved.id]);
      const history = await call('/customer/appointments?period=past', { headers });
      assert.deepEqual((await history.json() as { items: { id: string }[] }).items.map(item => item.id), [saved.id]);
      const noFuture = await call('/customer/appointments?period=upcoming', { headers });
      assert.deepEqual((await noFuture.json() as { items: unknown[] }).items, []);
    });

    await context.test('inactive users, expired sessions and logout are checked server-side', async () => {
      await database.pool(tenants[0]).execute('UPDATE users SET active = FALSE WHERE id = ?', [ownerIds[0]]);
      assert.equal((await call('/auth/me', { headers: { Cookie: ownerA.cookie } })).status, 401);
      await database.pool(tenants[0]).execute('UPDATE users SET active = TRUE WHERE id = ?', [ownerIds[0]]);
      await database.pool(tenants[1]).execute('UPDATE sessions SET expires_at = UTC_TIMESTAMP(3) - INTERVAL 1 SECOND');
      assert.equal((await call('/auth/me', { tenant: 1, headers: { Cookie: ownerB.cookie } })).status, 401);
      assert.equal((await call('/auth/logout', { method: 'POST', headers: { Cookie: ownerA.cookie, 'X-CSRF-Token': ownerA.csrf } })).status, 204);
      assert.equal((await call('/owner/appointments', { headers: { Cookie: ownerA.cookie } })).status, 401);
    });

    await context.test('login rate limiting is shared in MySQL and ignores untrusted forwarded IPs', async () => {
      let status = 0;
      for (let index = 0; index < 11; index++) {
        status = (await call('/auth/login', { method: 'POST', body: { email: 'nobody@example.com', password }, headers: { 'X-Forwarded-For': `10.0.0.${index + 1}` } })).status;
      }
      assert.equal(status, 429);
      const allowedOtherTenant = await call('/auth/login', { tenant: 1, method: 'POST', body: { email: 'nobody@example.com', password } });
      assert.equal(allowedOtherTenant.status, 401);
    });
  } finally {
    await app?.close();
    await database.onApplicationShutdown();
    for (const name of created) {
      assert.match(name, new RegExp(`^salon_test_${suffix}_[ab]$`));
      await admin.query(`DROP DATABASE \`${name}\``);
    }
    await admin.end();
  }
});