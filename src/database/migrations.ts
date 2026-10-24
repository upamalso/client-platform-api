export const migrations = [{
  version: '001-salon-core',
  statements: [
    `CREATE TABLE IF NOT EXISTS business (
      id TINYINT PRIMARY KEY, public_info JSON NOT NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS resources (
      id VARCHAR(50) PRIMARY KEY, name VARCHAR(120) NOT NULL
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS services (
      id VARCHAR(60) PRIMARY KEY, name VARCHAR(120) NOT NULL,
      duration_minutes SMALLINT UNSIGNED NOT NULL, price_pence INT UNSIGNED NOT NULL,
      resource_id VARCHAR(50) NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE,
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
      password_hash VARCHAR(100) NOT NULL, role ENUM('OWNER','CUSTOMER') NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL,
      csrf_token CHAR(64) NOT NULL, expires_at DATETIME(3) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX session_expiry (expires_at)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS booking_locks (
      resource_id VARCHAR(50) NOT NULL, booking_date DATE NOT NULL,
      PRIMARY KEY (resource_id, booking_date),
      FOREIGN KEY (resource_id) REFERENCES resources(id)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS appointments (
      id CHAR(36) PRIMARY KEY, reference VARCHAR(40) NOT NULL UNIQUE,
      idempotency_key CHAR(36) NOT NULL UNIQUE, request_hash CHAR(64) NOT NULL,
      service_id VARCHAR(60) NOT NULL, service_name VARCHAR(120) NOT NULL,
      resource_id VARCHAR(50) NOT NULL, booking_date DATE NOT NULL,
      start_minute SMALLINT UNSIGNED NOT NULL, end_minute SMALLINT UNSIGNED NOT NULL,
      price_pence INT UNSIGNED NOT NULL,
      first_name VARCHAR(80) NOT NULL, last_name VARCHAR(80) NOT NULL,
      email VARCHAR(254) NOT NULL, phone VARCHAR(30) NOT NULL,
      new_client BOOLEAN NOT NULL, notes VARCHAR(1000) NOT NULL DEFAULT '',
      status ENUM('confirmed','cancelled','completed') NOT NULL DEFAULT 'confirmed',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (resource_id) REFERENCES resources(id),
      INDEX resource_day_status (resource_id, booking_date, status, start_minute)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS rate_limits (
      bucket_key CHAR(64) PRIMARY KEY, window_start BIGINT UNSIGNED NOT NULL,
      hits INT UNSIGNED NOT NULL, INDEX rate_expiry (window_start)
    ) ENGINE=InnoDB`,
  ],
}, {
  version: '002-customer-accounts',
  statements: [
    `CREATE TABLE IF NOT EXISTS user_profiles (
      user_id CHAR(36) PRIMARY KEY, name VARCHAR(120) NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS customer_appointments (
      appointment_id CHAR(36) PRIMARY KEY, customer_id CHAR(36) NOT NULL,
      FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      INDEX customer_bookings (customer_id, appointment_id)
    ) ENGINE=InnoDB`,
  ],
}];

export const migrationProfiles: Readonly<Record<string, typeof migrations>> = {
  salon: migrations,
};

export function migrationsFor(profile: string): typeof migrations {
  const selected = migrationProfiles[profile];
  if (!selected) throw new Error('Unregistered migration profile');
  return selected;
}