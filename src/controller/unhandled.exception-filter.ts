import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { buildErrorResponse, logException } from './error-response.util';

/**
 * True last resort — catches anything not already handled as an
 * HttpException (a thrown string, a driver error, a programming bug, an
 * unhandled promise rejection surfaced by Nest). Always responds 500 with
 * a generic message.
 *
 * Never leak `exception.message` or a stack trace into the response body
 * — that can expose internals (SQL fragments, file paths, library
 * versions) to the caller. The real detail goes to the log only.
 *
 * Registration order in setup-app.ts: this must be registered LAST, since
 * @Catch() with no argument matches everything, and would swallow more
 * specific filters if it ran first.
 */
@Catch()
export class UnhandledExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnhandledExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const stack =
      exception instanceof Error ? exception.stack : String(exception);
    logException(
      this.logger,
      request,
      statusCode,
      'Unhandled exception',
      stack,
    );

    response
      .status(statusCode)
      .json(buildErrorResponse('Internal server error', 'InternalServerError'));
  }
}
