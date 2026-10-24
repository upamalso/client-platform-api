import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { timingSafeEqual } from 'node:crypto';
import { AppConfig, CONFIG } from '../config';
import { AuthService } from '../auth/auth.service';
import { TenantRequest } from '../common/context';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class PlatformGuard implements CanActivate {
  constructor(
    @Inject(CONFIG) private readonly config: AppConfig,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RateLimitService) private readonly rates: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    if (this.reflector.get<boolean>('health', handler)) return true;
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const id = request.headers['x-tenant-id'];
    const tenant = this.config.tenants.find(item => item.id === id);
    if (!tenant) throw new NotFoundException('Unknown website');
    request.tenant = tenant;
    const origin = request.headers.origin;
    const writes = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
    if ((origin && !tenant.origins.includes(origin)) || (writes && !origin)) {
      throw new ForbiddenException('Origin is not permitted for this website');
    }
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    await this.rates.check(tenant, ip, 'general', 300, 60);
    if (request.path.endsWith('/auth/login')) await this.rates.check(tenant, ip, 'login', 10, 900);
    if (request.path.endsWith('/auth/register')) await this.rates.check(tenant, ip, 'register', 5, 3600);
    if (request.method === 'POST' && (request.path.endsWith('/public/appointments') || request.path.endsWith('/customer/appointments'))) {
      await this.rates.check(tenant, ip, 'booking', 10, 3600);
    }
    if (this.reflector.get<boolean>('public', handler)) return true;
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const identity = await this.auth.authenticate(tenant, cookies?.[this.auth.cookieName(tenant)]);
    request.identity = identity;
    if (this.reflector.get<boolean>('owner', handler) && identity.role !== 'OWNER') {
      throw new ForbiddenException('Business owner access required');
    }
    if (this.reflector.get<boolean>('customer', handler) && identity.role !== 'CUSTOMER') {
      throw new ForbiddenException('Customer account required');
    }
    if (writes) {
      const supplied = request.headers['x-csrf-token'];
      if (typeof supplied !== 'string' || !/^[a-f0-9]{64}$/.test(supplied)
        || !timingSafeEqual(Buffer.from(supplied), Buffer.from(identity.csrfToken))) {
        throw new ForbiddenException('Invalid CSRF token');
      }
    }
    return true;
  }
}