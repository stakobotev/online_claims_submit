import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { HttpError } from './errorHandler.js';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      return next(new HttpError(400, 'VALIDATION_ERROR', 'Validation failed.', details as Record<string, unknown>));
    }
    (req as unknown as Record<string, unknown>)[target] = result.data;
    next();
  };
}
