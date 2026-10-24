import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

export interface Interval { start: number; end: number }
export type Schedule = Readonly<Record<string, readonly [number, number] | null>>;

export function businessDate(date: string, timezone: string, now: DateTime = DateTime.now()): DateTime {
  const parsed = DateTime.fromISO(date, { zone: timezone });
  const today = now.setZone(timezone).startOf('day');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !parsed.isValid || parsed.toISODate() !== date
    || parsed < today || parsed > today.plus({ days: 90 })) {
    throw new BadRequestException('Choose a valid date within the next 90 days');
  }
  return parsed;
}

export function availableTimes(date: DateTime, schedule: Schedule, duration: number,
  bookings: readonly Interval[], now: DateTime = DateTime.now()): string[] {
  const hours = schedule[String(date.weekday)];
  if (!hours) return [];
  const slots: string[] = [];
  for (let start = hours[0]; start + duration <= hours[1]; start += 30) {
    const end = start + duration;
    if (date.startOf('day').plus({ minutes: start }) < now.plus({ minutes: 30 })) continue;
    if (bookings.some(booking => start < booking.end && end > booking.start)) continue;
    slots.push(`${Math.floor(start / 60).toString().padStart(2, '0')}:${(start % 60).toString().padStart(2, '0')}`);
  }
  return slots;
}