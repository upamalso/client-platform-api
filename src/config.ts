import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DateTime } from 'luxon';
import { migrationProfiles } from './database/migrations';

export interface Tenant {
  readonly id: string;
  readonly database: string;
  readonly name: string;
  readonly timezone: string;
  readonly profile: string;
  readonly origins: readonly string[];
  readonly userEnv?: string;
  readonly passwordEnv?: string;
}

export function parseTenants(value: unknown): readonly Tenant[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new Error('Configure between 1 and 100 tenants');
  }
  const ids = new Set<string>();
  const databases = new Set<string>();
  return value.map((entry: unknown) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid tenant');
    const tenant = entry as Record<string, unknown>;
    if (typeof tenant.id !== 'string' || !/^[a-z][a-z0-9-]{2,49}$/.test(tenant.id)
      || typeof tenant.database !== 'string' || !/^salon_[a-z0-9_]{1,48}$/.test(tenant.database)
      || typeof tenant.name !== 'string' || tenant.name.length > 120
      || typeof tenant.timezone !== 'string' || !DateTime.now().setZone(tenant.timezone).isValid
      || typeof tenant.profile !== 'string' || !Object.hasOwn(migrationProfiles, tenant.profile)
      || !Array.isArray(tenant.origins) || !tenant.origins.length) {
      throw new Error('Invalid tenant configuration');
    }
    if (ids.has(tenant.id) || databases.has(tenant.database)) throw new Error('Duplicate tenant or database');
    for (const origin of tenant.origins) {
      if (typeof origin !== 'string' || new URL(origin).origin !== origin
        || !/^https?:\/\//.test(origin)) throw new Error('Invalid tenant origin');
    }
    for (const field of ['userEnv', 'passwordEnv']) {
      if (tenant[field] !== undefined && (typeof tenant[field] !== 'string'
        || !/^[A-Z][A-Z0-9_]+$/.test(tenant[field] as string))) throw new Error('Invalid credential environment key');
    }
    ids.add(tenant.id);
    databases.add(tenant.database);
    return Object.freeze({ ...tenant, origins: Object.freeze([...tenant.origins]) }) as unknown as Tenant;
  });
}

function integer(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

export function loadConfig() {
  const production = process.env.NODE_ENV === 'production';
  const dbTls = process.env.DB_TLS === 'true';
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!user || password === undefined) throw new Error('DB_USER and DB_PASSWORD must be configured in the environment');
  const tenants = parseTenants(JSON.parse(readFileSync(resolve(process.env.TENANTS_FILE ?? 'tenants.json'), 'utf8')));
  if (production && tenants.some(tenant => !tenant.userEnv || !tenant.passwordEnv
    || tenant.origins.some(origin => !origin.startsWith('https://')))) {
    throw new Error('Production requires tenant-specific credentials and HTTPS origins');
  }
  if (production && !dbTls) throw new Error('Production database connections require TLS');
  const apiHost = process.env.API_HOST ?? '127.0.0.1';
  if (!['127.0.0.1', '0.0.0.0', '::1', '::'].includes(apiHost)) throw new Error('Invalid API_HOST');
  return {
    production, tenants, apiHost,
    dbTls,
    dbCa: process.env.DB_SSL_CA_FILE ? readFileSync(resolve(process.env.DB_SSL_CA_FILE), 'utf8') : undefined,
    port: integer('PORT', 3000, 1, 65535),
    host: process.env.DB_HOST ?? 'localhost',
    dbPort: integer('DB_PORT', 3306, 1, 65535),
    user,
    password,
    poolSize: integer('DB_POOL_SIZE', 5, 1, 20),
    sessionHours: integer('SESSION_HOURS', 8, 1, 24),
    trustProxyHops: integer('TRUST_PROXY_HOPS', 0, 0, 3),
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
export const CONFIG = Symbol('CONFIG');