import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.NODE_ENV === 'test' ? 'silent' : 'info',
  ...(config.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss.l' },
        },
      }
    : {}),
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    censor: '[redacted]',
  },
});
