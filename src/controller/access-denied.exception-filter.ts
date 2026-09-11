import type {
  ArgumentsHost,
  ExceptionFilter} from '@nestjs/common';
import {
  Catch,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AccessDeniedError } from 'src/application';
import { buildErrorResponse, logException } from './error-response.util';

@Catch(AccessDeniedError)
export class AccessDeniedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AccessDeniedExceptionFilter.name);

  catch(exception: AccessDeniedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    logException(this.logger, request, HttpStatus.FORBIDDEN, exception.message);

    response
      .status(HttpStatus.FORBIDDEN)
      .json(buildErrorResponse(exception.message, 'AccessDenied'));
  }
}