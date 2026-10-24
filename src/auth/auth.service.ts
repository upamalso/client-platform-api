import { BadRequestException, ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { AppConfig, CONFIG, Tenant } from '../config';
import { DatabaseService } from '../database/database.service';
import { Identity } from '../common/context';
import { CredentialsDto, RegisterDto } from './auth.dto';
import { hashPassword, validatePassword, verifyPassword } from './password';

export const digest = (value: string): string => createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword('unused-dummy-account-1!');

  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(CONFIG) private readonly config: AppConfig,
  ) {}

  cookieName(tenant: Tenant): string {
    return `${this.config.production ? '__Host-' : ''}session_${tenant.id}`;
  }

  async register(tenant: Tenant, credentials: RegisterDto): Promise<{ created: true }> {
    const password = await hashPassword(credentials.password);
    const connection = await this.database.pool(tenant).getConnection();
    try {
      await connection.beginTransaction();
      const id = randomUUID();
      await connection.execute(
        "INSERT INTO users (id, email, password_hash, role) VALUES (?, ?, ?, 'CUSTOMER')",
        [id, credentials.email, password]);
      await connection.execute('INSERT INTO user_profiles (user_id, name) VALUES (?, ?)', [id, credentials.name]);
      await connection.commit();
    } catch (error: unknown) {
      await connection.rollback();
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') throw new ConflictException('Unable to register account');
      throw error;
    } finally {
      connection.release();
    }
    return { created: true };
  }

  async login(tenant: Tenant, credentials: CredentialsDto) {
    validatePassword(credentials.password);
    const pool = this.database.pool(tenant);
    const [users] = await pool.execute<RowDataPacket[]>(
      `SELECT u.id, u.email, u.password_hash, u.role, u.active, COALESCE(p.name, '') AS name
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.email = ?`, [credentials.email]);
    const user = users[0];
    const matches = await verifyPassword(credentials.password, user?.password_hash ?? await this.dummyHash);
    if (!user || !user.active || !matches) throw new UnauthorizedException('Invalid email or password');
    const token = randomBytes(32).toString('hex');
    const csrfToken = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + this.config.sessionHours * 3_600_000);
    await pool.execute('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP(3)');
    await pool.execute('INSERT INTO sessions (token_hash, user_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)',
      [digest(token), user.id, csrfToken, expires]);
    return { token, csrfToken, user: { id: user.id as string, name: user.name as string, email: user.email as string, role: user.role as string } };
  }

  async authenticate(tenant: Tenant, token: unknown): Promise<Identity> {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new UnauthorizedException('Login required');
    const tokenHash = digest(token);
    const [rows] = await this.database.pool(tenant).execute<RowDataPacket[]>(
      `SELECT u.id, u.email, u.role, COALESCE(p.name, '') AS name, s.csrf_token FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP(3) AND u.active = TRUE`, [tokenHash]);
    if (!rows.length) throw new UnauthorizedException('Session expired or invalid');
    return { id: rows[0].id as string, name: rows[0].name as string, email: rows[0].email as string,
      role: rows[0].role as Identity['role'], csrfToken: rows[0].csrf_token as string, tokenHash };
  }

  async logout(tenant: Tenant, tokenHash: string): Promise<void> {
    if (!tokenHash) throw new BadRequestException('Invalid session');
    await this.database.pool(tenant).execute('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]);
  }
}