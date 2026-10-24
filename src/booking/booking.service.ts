import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Tenant } from '../config';
import { DatabaseService } from '../database/database.service';
import { digest } from '../auth/auth.service';
import { AvailabilityDto, BookingDto, CustomerBookingsDto, ListBookingsDto } from './booking.dto';
import { availableTimes, businessDate, Schedule } from './schedule';

interface ServiceRow extends RowDataPacket {
  id: string; name: string; duration_minutes: number; price_pence: number; resource_id: string;
}
interface AppointmentRow extends RowDataPacket {
  id: string; reference: string; request_hash: string; service_id: string; service_name: string;
  booking_date: string; start_minute: number; end_minute: number; status: string;
  price_pence: number; created_at: string;
}
export interface PublicBusiness {
  name: string; timezone: string; currency: string; demo: boolean;
  phone: string; email: string; addressLines: string[]; schedule: Schedule;
}

@Injectable()
export class BookingService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async business(tenant: Tenant) {
    const pool = this.database.pool(tenant);
    const [business] = await pool.query<RowDataPacket[]>('SELECT public_info FROM business WHERE id = 1');
    if (!business.length) throw new NotFoundException('Business setup is not complete');
    const info = business[0].public_info as PublicBusiness;
    const [services] = await pool.query<ServiceRow[]>('SELECT * FROM services WHERE active = TRUE ORDER BY name');
    return { ...info, timezone: tenant.timezone, services: services.map(service => ({
      id: service.id, name: service.name, durationMinutes: service.duration_minutes,
      price: service.price_pence / 100,
    })) };
  }

  private async serviceContext(tenant: Tenant, query: AvailabilityDto) {
    const date = businessDate(query.date, tenant.timezone);
    const pool = this.database.pool(tenant);
    const [services] = await pool.execute<ServiceRow[]>('SELECT * FROM services WHERE id = ? AND active = TRUE', [query.serviceId]);
    if (!services.length) throw new NotFoundException('Treatment is not available');
    const business = await this.business(tenant);
    return { date, service: services[0], schedule: business.schedule };
  }

  async availability(tenant: Tenant, query: AvailabilityDto) {
    const { date, service, schedule } = await this.serviceContext(tenant, query);
    const [rows] = await this.database.pool(tenant).execute<AppointmentRow[]>(
      `SELECT start_minute, end_minute FROM appointments WHERE resource_id = ?
       AND booking_date = ? AND status <> 'cancelled'`, [service.resource_id, query.date]);
    return { date: query.date, timezone: tenant.timezone,
      times: availableTimes(date, schedule, service.duration_minutes,
        rows.map(row => ({ start: row.start_minute, end: row.end_minute }))) };
  }

  private confirmation(row: AppointmentRow) {
    return { id: row.id, reference: row.reference, serviceId: row.service_id,
      serviceName: row.service_name, date: row.booking_date,
      time: `${Math.floor(row.start_minute / 60).toString().padStart(2, '0')}:${(row.start_minute % 60).toString().padStart(2, '0')}`,
      durationMinutes: row.end_minute - row.start_minute, price: row.price_pence / 100,
      status: row.status, createdAt: row.created_at };
  }

  private async existing(tenant: Tenant, key: string, requestHash: string, connection?: PoolConnection) {
    const [rows] = await (connection ?? this.database.pool(tenant)).execute<AppointmentRow[]>(
      'SELECT * FROM appointments WHERE idempotency_key = ?', [key]);
    if (!rows.length) return undefined;
    if (rows[0].request_hash !== requestHash) throw new ConflictException('Idempotency key was already used for a different request');
    return this.confirmation(rows[0]);
  }

  async book(tenant: Tenant, input: BookingDto, key: string, customerId?: string) {
    const data = { serviceId: input.serviceId, date: input.date, time: input.time,
      firstName: input.firstName.trim(), lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(), phone: input.phone.trim(),
      newClient: Boolean(input.newClient), notes: input.notes?.trim() ?? '' };
    const requestHash = digest(JSON.stringify(customerId ? { ...data, customerId } : data));
    const previous = await this.existing(tenant, key, requestHash);
    if (previous) return previous;
    const { date, service, schedule } = await this.serviceContext(tenant, input);
    if (!availableTimes(date, schedule, service.duration_minutes, []).includes(data.time)) {
      throw new BadRequestException('Choose an available appointment time');
    }
    const [hour, minute] = data.time.split(':').map(Number);
    const start = hour * 60 + minute;
    const end = start + service.duration_minutes;
    const connection = await this.database.pool(tenant).getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('INSERT IGNORE INTO booking_locks (resource_id, booking_date) VALUES (?, ?)', [service.resource_id, data.date]);
      await connection.execute('SELECT resource_id FROM booking_locks WHERE resource_id = ? AND booking_date = ? FOR UPDATE', [service.resource_id, data.date]);
      const retry = await this.existing(tenant, key, requestHash, connection);
      if (retry) { await connection.commit(); return retry; }
      const [overlaps] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM appointments WHERE resource_id = ? AND booking_date = ?
         AND status <> 'cancelled' AND start_minute < ? AND end_minute > ?`,
        [service.resource_id, data.date, end, start]);
      if (overlaps.length) throw new ConflictException('That time was just booked; choose another slot');
      const id = randomUUID();
      const reference = `${tenant.id === 'ana-glow' ? 'ANA' : 'EML'}-${randomUUID().replaceAll('-', '').slice(0, 16).toUpperCase()}`;
      await connection.execute(`INSERT INTO appointments
        (id, reference, idempotency_key, request_hash, service_id, service_name, resource_id,
         booking_date, start_minute, end_minute, price_pence, first_name, last_name, email, phone, new_client, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, reference, key, requestHash, service.id, service.name, service.resource_id,
        data.date, start, end, service.price_pence, data.firstName, data.lastName,
        data.email, data.phone, data.newClient, data.notes]);
      if (customerId) {
        await connection.execute('INSERT INTO customer_appointments (appointment_id, customer_id) VALUES (?, ?)', [id, customerId]);
      }
      const [rows] = await connection.execute<AppointmentRow[]>('SELECT * FROM appointments WHERE id = ?', [id]);
      await connection.commit();
      return this.confirmation(rows[0]);
    } catch (error: unknown) {
      await connection.rollback();
      if ((error as { code?: string }).code === 'ER_DUP_ENTRY') {
        const replay = await this.existing(tenant, key, requestHash);
        if (replay) return replay;
        throw new ConflictException('Booking conflict; retry with the same idempotency key');
      }
      if ((error as { code?: string }).code === 'ER_LOCK_DEADLOCK') {
        throw new ConflictException('Booking is busy; retry with the same idempotency key');
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  async list(tenant: Tenant, query: ListBookingsDto) {
    const clauses: string[] = [];
    const values: (string | number)[] = [];
    if (query.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query.date)) throw new BadRequestException('Invalid date');
      clauses.push('booking_date = ?'); values.push(query.date);
    }
    if (query.status) { clauses.push('status = ?'); values.push(query.status); }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const pool = this.database.pool(tenant);
    const [count] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM appointments ${where}`, values);
    const [rows] = await pool.query<AppointmentRow[]>(
      `SELECT * FROM appointments ${where} ORDER BY booking_date DESC, start_minute DESC, id
       LIMIT ? OFFSET ?`, [...values, query.limit, (query.page - 1) * query.limit]);
    return { total: Number(count[0].total), page: query.page, limit: query.limit,
      items: rows.map(row => ({ ...this.confirmation(row), firstName: row.first_name,
        lastName: row.last_name, email: row.email, phone: row.phone,
        newClient: Boolean(row.new_client), notes: row.notes })) };
  }

  async listCustomer(tenant: Tenant, customerId: string, query: CustomerBookingsDto) {
    const now = DateTime.now().setZone(tenant.timezone);
    const today = now.toISODate()!;
    const minute = now.hour * 60 + now.minute;
    const past = '(a.booking_date < ? OR (a.booking_date = ? AND a.end_minute <= ?))';
    const where = `WHERE c.customer_id = ? AND ${query.period === 'past' ? past : `NOT ${past}`}`;
    const values = [customerId, today, today, minute];
    const from = 'FROM appointments a JOIN customer_appointments c ON c.appointment_id = a.id';
    const pool = this.database.pool(tenant);
    const [counts] = await pool.execute<RowDataPacket[]>(`SELECT COUNT(*) AS total ${from} ${where}`, values);
    const direction = query.period === 'past' ? 'DESC' : 'ASC';
    const [rows] = await pool.query<AppointmentRow[]>(
      `SELECT a.* ${from} ${where} ORDER BY a.booking_date ${direction}, a.start_minute ${direction}, a.id
       LIMIT ? OFFSET ?`, [...values, query.limit, (query.page - 1) * query.limit]);
    return { total: Number(counts[0].total), page: query.page, limit: query.limit,
      period: query.period, timezone: tenant.timezone, items: rows.map(row => this.confirmation(row)) };
  }

  async changeStatus(tenant: Tenant, id: string, status: 'cancelled' | 'completed') {
    const pool = this.database.pool(tenant);
    const [updated] = await pool.execute<ResultSetHeader>(
      "UPDATE appointments SET status = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND status = 'confirmed'", [status, id]);
    const [rows] = await pool.execute<AppointmentRow[]>('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!rows.length) throw new NotFoundException('Booking not found');
    if (!updated.affectedRows && rows[0].status !== status) throw new ConflictException('Booking is no longer confirmed');
    return this.confirmation(rows[0]);
  }
}