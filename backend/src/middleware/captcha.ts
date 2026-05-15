import type { Request, Response, NextFunction } from 'express';
import { verifyHCaptcha } from '../lib/captcha.js';
import { HttpError } from './errorHandler.js';

export function requireCaptcha(tokenField = 'captchaToken') {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = (req.body as Record<string, unknown>)[tokenField] as string | undefined;
    if (!token) {
      return next(new HttpError(400, 'CAPTCHA_FAILED', 'CAPTCHA token is required.'));
    }
    const ip = req.ip ?? undefined;
    const ok = await verifyHCaptcha(token, ip);
    if (!ok) {
      return next(new HttpError(400, 'CAPTCHA_FAILED', 'CAPTCHA verification failed.'));
    }
    next();
  };
}
