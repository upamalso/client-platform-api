import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { TenantRequest } from './context';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpErrors');

  catch(error: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<TenantRequest>();
    const response = host.switchToHttp().getResponse<Response>();
    const parserType = error && typeof error === 'object' ? (error as { type?: string }).type : undefined;
    const parserStatus = parserType === 'entity.parse.failed' ? 400 : parserType === 'entity.too.large' ? 413 : undefined;
    const status = error instanceof HttpException ? error.getStatus() : parserStatus ?? 500;
    const body = error instanceof HttpException ? error.getResponse() : undefined;
    const message = parserStatus ? 'Invalid or oversized JSON request body' : status >= 500 ? 'Service temporarily unavailable' :
      typeof body === 'string' ? body : (body as { message?: unknown })?.message ?? 'Request failed';
    if (status >= 500) this.logger.error(`${request.requestId}: ${error instanceof Error ? error.constructor.name : 'UnknownError'}`);
    response.status(status).json({ statusCode: status, message, requestId: request.requestId });
  }
}