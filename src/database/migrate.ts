import { createConnection, Pool, RowDataPacket } from 'mysql2/promise';
import { AppConfig, Tenant } from '../config';
import { migrationsFor } from './migrations';

export async function migrateTenant(config: AppConfig, tenant: Tenant): Promise<void> {
  const connection = await createConnection({
    host: config.host, port: config.dbPort,
    user: process.env.MIGRATION_DB_USER ?? config.user,
    password: process.env.MIGRATION_DB_PASSWORD ?? config.password,
    multipleStatements: false,
    ssl: config.dbTls ? { rejectUnauthorized: true, verifyIdentity: true, ...(config.dbCa ? { ca: config.dbCa } : {}) } : undefined,
  });
  const lock = `client-platform-migrate:${tenant.database}`;
  try {
    const [locks] = await connection.execute<RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS acquired', [lock]);
    if (Number(locks[0].acquired) !== 1) throw new Error('Migration lock unavailable');
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${tenant.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${tenant.database}\``);
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) PRIMARY KEY, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB`);
    for (const migration of migrationsFor(tenant.profile)) {
      const [existing] = await connection.execute<RowDataPacket[]>('SELECT version FROM schema_migrations WHERE version = ?', [migration.version]);
      if (existing.length) continue;
      for (const statement of migration.statements) await connection.query(statement);
      await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]);
    }
  } finally {
    await connection.execute('SELECT RELEASE_LOCK(?)', [lock]).catch(() => undefined);
    await connection.end();
  }
}

export async function verifyMigrations(pool: Pool, profile: string): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT version FROM schema_migrations');
  if (migrationsFor(profile).some(migration => !rows.some(row => row.version === migration.version))) {
    throw new Error('Database migrations are pending');
  }
}