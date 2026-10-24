import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { AppConfig, loadConfig } from './config';
import { AppModule } from './app.module';
import { HttpErrorFilter } from './common/http-error.filter';
import { TenantRequest } from './common/context';

export async function createApp(config: AppConfig = loadConfig(), logging = true) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config), {
    bodyParser: false, logger: logging ? ['log', 'warn', 'error'] : false,
  });
  app.disable('x-powered-by');
  if (config.trustProxyHops) app.set('trust proxy', config.trustProxyHops);
  app.use((request: Request, response: Response, next: NextFunction) => {
    (request as TenantRequest).requestId = randomUUID();
    response.setHeader('X-Request-ID', (request as TenantRequest).requestId);
    response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(helmet());
  app.use(json({ limit: '16kb', strict: true }));
  app.use(cookieParser());
  const origins = new Set(config.tenants.flatMap(tenant => tenant.origins));
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || origins.has(origin)),
    credentials: true, methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-Tenant-ID', 'X-CSRF-Token', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-ID'], maxAge: 600,
  });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    transform: true, whitelist: true, forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
  }));
  app.useGlobalFilters(new HttpErrorFilter());
  app.enableShutdownHooks();
  await app.init();
  return app;
}