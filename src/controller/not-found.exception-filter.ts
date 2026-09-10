import type {
  ArgumentsHost,
  ExceptionFilter} from '@nestjs/common';
import {
  Catch,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { NotFoundError } from '../application';
import { buildErrorResponse, logException } from './error-response.util';

@Catch(NotFoundError)
export class NotFoundExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(NotFoundExceptionFilter.name);

  catch(exception: NotFoundError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    logException(this.logger, request, HttpStatus.NOT_FOUND, exception.message);
    response
      .status(HttpStatus.NOT_FOUND)
      .json(buildErrorResponse(exception.message, 'NotFound'));
  }
}
