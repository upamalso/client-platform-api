import { HttpException, Inject, Injectable } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { Tenant } from '../config';
import { DatabaseService } from '../database/database.service';
import { digest } from '../auth/auth.service';

@Injectable()
export class RateLimitService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async check(tenant: Tenant, ip: string, scope: string, limit: number, seconds: number): Promise<void> {
    const pool = this.database.pool(tenant);
    const key = digest(`${ip}:${scope}`);
    const window = Math.floor(Date.now() / (seconds * 1000)) * seconds;
    await pool.execute(`INSERT INTO rate_limits (bucket_key, window_start, hits) VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE hits = IF(window_start = VALUES(window_start), hits + 1, 1),
      window_start = VALUES(window_start)`, [key, window]);
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT hits FROM rate_limits WHERE bucket_key = ?', [key]);
    if (Number(rows[0].hits) > limit) throw new HttpException('Too many requests; try again later', 429);
  }
}