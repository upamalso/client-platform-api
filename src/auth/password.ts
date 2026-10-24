import { BadRequestException } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';

export function validatePassword(password: string): void {
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
    throw new BadRequestException('Password must be at least 12 characters and no more than 72 UTF-8 bytes');
  }
}

export async function hashPassword(password: string): Promise<string> {
  validatePassword(password);
  return hash(password, 12);
}

export const verifyPassword = compare;