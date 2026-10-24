import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { createPool, Pool, RowDataPacket } from 'mysql2/promise';
import { AppConfig, CONFIG, Tenant } from '../config';
import { verifyMigrations } from './migrate';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pools = new Map<string, Pool>();

  constructor(@Inject(CONFIG) private readonly config: AppConfig) {}

  pool(tenant: Tenant): Pool {
    if (!this.config.tenants.includes(tenant)) throw new Error('Unregistered tenant context');
    let pool = this.pools.get(tenant.id);
    if (!pool) {
      const user = tenant.userEnv ? process.env[tenant.userEnv] : this.config.user;
      const password = tenant.passwordEnv ? process.env[tenant.passwordEnv] : this.config.password;
      if (!user || password === undefined) throw new Error('Missing tenant database credentials');
      if (this.config.production && user === 'root') throw new Error('Root database access is not permitted in production');
      pool = createPool({
        host: this.config.host, port: this.config.dbPort, user, password,
        database: tenant.database, connectionLimit: this.config.poolSize,
        waitForConnections: true, queueLimit: 100, connectTimeout: 5000,
        multipleStatements: false, dateStrings: true, timezone: 'Z',
        charset: 'utf8mb4',
        ssl: this.config.dbTls ? { rejectUnauthorized: true, verifyIdentity: true, ...(this.config.dbCa ? { ca: this.config.dbCa } : {}) } : undefined,
      });
      this.pools.set(tenant.id, pool);
    }
    return pool;
  }

  async ready(): Promise<void> {
    for (const tenant of this.config.tenants) {
      await this.pool(tenant).query<RowDataPacket[]>('SELECT 1 AS ready');
      await verifyMigrations(this.pool(tenant), tenant.profile);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await Promise.all([...this.pools.values()].map(pool => pool.end()));
  }
}