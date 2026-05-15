import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const authRateLimit = rateLimit({
  windowMs: 60_000,
  max: config.RATE_LIMIT_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});

export const complaintSubmitRateLimit = rateLimit({
  windowMs: 60_000,
  max: config.RATE_LIMIT_COMPLAINT_SUBMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
});
