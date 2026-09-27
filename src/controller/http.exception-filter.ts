import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { buildErrorResponse, logException } from './error-response.util';

/**
 * Catches any HttpException not already handled by a more specific filter
 * (NotFoundExceptionFilter, AccessDeniedExceptionFilter,
 * ValidationExceptionFilter) — e.g. 401 thrown by JwtAuthGuard, 403 thrown
 * by RolesGuard, 409 conflicts thrown directly from a service.
 *
 * Registration order in setup-app.ts matters: this must come AFTER the
 * more specific filters and BEFORE UnhandledExceptionFilter, since NestJS
 * matches @Catch() filters by exception type specificity in registration
 * order for a given exception instance.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? ((exceptionResponse as { message?: string }).message ??
          exception.message)
        : exception.message;

    logException(this.logger, request, statusCode, message);

    response
      .status(statusCode)
      .json(buildErrorResponse(message, exception.name));
  }
}
