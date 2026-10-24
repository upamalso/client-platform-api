import { Body, Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppConfig, CONFIG } from '../config';
import { TenantRequest } from '../common/context';
import { Public } from '../security/access';
import { CredentialsDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService, @Inject(CONFIG) private readonly config: AppConfig) {}

  @Public()
  @Post('register')
  register(@Req() request: TenantRequest, @Body() body: RegisterDto) {
    return this.auth.register(request.tenant, body);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Req() request: TenantRequest, @Body() body: CredentialsDto, @Res({ passthrough: true }) response: Response) {
    const current = request.cookies?.[this.auth.cookieName(request.tenant)] as unknown;
    const session = await this.auth.login(request.tenant, body);
    if (typeof current === 'string' && /^[a-f0-9]{64}$/.test(current)) {
      const { digest } = await import('./auth.service');
      await this.auth.logout(request.tenant, digest(current));
    }
    response.cookie(this.auth.cookieName(request.tenant), session.token, {
      httpOnly: true, secure: this.config.production, sameSite: 'lax', path: '/',
      maxAge: this.config.sessionHours * 3_600_000,
    });
    return { user: session.user, csrfToken: session.csrfToken, tenantId: request.tenant.id };
  }

  @Get('me')
  me(@Req() request: TenantRequest) {
    const identity = request.identity!;
    return { user: { id: identity.id, name: identity.name, email: identity.email, role: identity.role },
      csrfToken: identity.csrfToken, tenantId: request.tenant.id };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: TenantRequest, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.tenant, request.identity!.tokenHash);
    response.clearCookie(this.auth.cookieName(request.tenant), {
      httpOnly: true, secure: this.config.production, sameSite: 'lax', path: '/',
    });
  }
}