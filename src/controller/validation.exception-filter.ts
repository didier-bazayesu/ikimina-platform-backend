import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { BadRequestException, Catch, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { logException } from './error-response.util';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const body = exception.getResponse() as { message: string | string[] };
    logException(
      this.logger,
      request,
      HttpStatus.BAD_REQUEST,
      exception.message,
    );
    response.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message,
      error: 'ValidationError',
    });
  }
}
