import { Controller, DynamicModule, Get, Global, Inject, Module, ServiceUnavailableException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppConfig, CONFIG } from './config';
import { DatabaseService } from './database/database.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { Health } from './security/access';
import { PlatformGuard } from './security/platform.guard';
import { RateLimitService } from './security/rate-limit.service';
import { BookingService } from './booking/booking.service';
import { CustomerBookingController, OwnerBookingController, PublicBookingController } from './booking/booking.controller';

@Global()
@Module({})
class RuntimeModule {
  static register(config: AppConfig): DynamicModule {
    return { module: RuntimeModule, providers: [{ provide: CONFIG, useValue: config }], exports: [CONFIG] };
  }
}

@Global()
@Module({ providers: [DatabaseService], exports: [DatabaseService] })
class DatabaseModule {}

@Module({ controllers: [AuthController], providers: [AuthService], exports: [AuthService] })
class AuthModule {}

@Module({ imports: [AuthModule], providers: [RateLimitService, { provide: APP_GUARD, useClass: PlatformGuard }] })
class SecurityModule {}

@Module({ controllers: [PublicBookingController, OwnerBookingController, CustomerBookingController], providers: [BookingService] })
class BookingModule {}

@Controller('health')
class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  @Health()
  @Get()
  async health() {
    try { await this.database.ready(); return { status: 'ok' }; }
    catch { throw new ServiceUnavailableException(); }
  }
}

@Module({})
export class AppModule {
  static register(config: AppConfig): DynamicModule {
    return { module: AppModule,
      imports: [RuntimeModule.register(config), DatabaseModule, AuthModule, SecurityModule, BookingModule],
      controllers: [HealthController] };
  }
}