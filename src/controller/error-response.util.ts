import type { Request } from 'express';

export interface ErrorResponseBody {
  success: false;
  message: string;
  error: string;
}

export function buildErrorResponse(
  message: string,
  error: string,
): ErrorResponseBody {
  return { success: false, message, error };
}

export function logException(
  logger: { warn: (m: string) => void; error: (m: string, s?: string) => void },
  request: Request,
  statusCode: number,
  message: string,
  stack?: string,
): void {
  const context = `[${request.method}] ${request.url} - ${statusCode}`;
  statusCode >= 500
    ? logger.error(context, stack)
    : logger.warn(`${context}: ${message}`);
}
