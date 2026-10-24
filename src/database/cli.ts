import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../config';
import { DatabaseService } from './database.service';
import { migrateTenant } from './migrate';
import { seedTenant } from './seeds';
import { hashPassword } from '../auth/password';

async function run(): Promise<void> {
  const config = loadConfig();
  const database = new DatabaseService(config);
  const command = process.argv[2];
  const argument = (name: string) => process.argv[process.argv.indexOf(name) + 1];
  try {
    if (command === 'migrate') {
      for (const tenant of config.tenants) {
        await migrateTenant(config, tenant);
        console.log(`Migrations ready: ${tenant.id}`);
      }
    } else if (command === 'seed') {
      if (config.production) throw new Error('Demo seeding is disabled in production');
      for (const tenant of config.tenants) {
        await seedTenant(database.pool(tenant), tenant);
        console.log(`Demo seed ready: ${tenant.id}`);
      }
    } else if (command === 'maintenance') {
      for (const tenant of config.tenants) {
        const pool = database.pool(tenant);
        await pool.execute('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP(3)');
        await pool.execute('DELETE FROM rate_limits WHERE window_start < ?', [Math.floor(Date.now() / 1000) - 86400]);
        console.log(`Expired security records removed: ${tenant.id}`);
      }
    } else if (command === 'owner') {
      const tenant = config.tenants.find(item => item.id === argument('--tenant'));
      const email = argument('--email')?.trim().toLowerCase();
      const password = process.env.OWNER_PASSWORD;
      if (!tenant || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password) {
        throw new Error('Supply --tenant, --email and OWNER_PASSWORD via environment');
      }
      await database.pool(tenant).execute(
        'INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [randomUUID(), email, await hashPassword(password), 'OWNER']);
      console.log(`Owner created for ${tenant.id}`);
    } else {
      throw new Error('Use migrate, seed, owner, or maintenance');
    }
  } finally {
    await database.onApplicationShutdown();
  }
}

run().catch((error: unknown) => {
  console.error(error instanceof Error && !('sql' in error) ? error.message : 'Database command failed; check configuration and availability');
  process.exitCode = 1;
});