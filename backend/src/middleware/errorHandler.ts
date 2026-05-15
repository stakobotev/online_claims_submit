import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  logger.error({ err, requestId }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message: 'An unexpected error occurred.',
      ...(requestId ? { details: { requestId } } : {}),
    },
  });
}
