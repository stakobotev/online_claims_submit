import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import type { ServerResponse } from 'http';
import rateLimit from 'express-rate-limit';
import passport from 'passport';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { requestId } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';

import { authRouter } from './modules/auth/auth.router.js';
import { usersRouter } from './modules/users/users.router.js';
import { categoriesRouter } from './modules/categories/categories.router.js';
import { institutionsRouter } from './modules/institutions/institutions.router.js';
import { complaintsRouter } from './modules/complaints/complaints.router.js';
import { attachmentsRouter } from './modules/attachments/attachments.router.js';
import { statisticsRouter } from './modules/statistics/statistics.router.js';
import { adminRouter } from './modules/admin/admin.router.js';

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(requestId);

  app.use(
    pinoHttp({
      logger,
      customLogLevel(_req, res: ServerResponse) {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  );

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'hcaptcha.com', '*.hcaptcha.com'],
          frameSrc: ["'self'", 'hcaptcha.com', '*.hcaptcha.com'],
          connectSrc: ["'self'", 'hcaptcha.com', '*.hcaptcha.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
        },
      },
    }),
  );

  app.use(
    cors({
      origin: config.PUBLIC_FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(passport.initialize());

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: config.RATE_LIMIT_GLOBAL,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests.' } },
    }),
  );

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/config/public', (_req, res) => {
    res.json({
      minBodyLength: config.MIN_BODY_LENGTH,
      maxAttachments: config.MAX_ATTACHMENTS,
      maxAttachmentTotalBytes: config.MAX_ATTACHMENT_TOTAL_BYTES,
      allowedAttachmentMime: ['application/pdf', 'image/bmp', 'image/jpeg', 'image/png', 'image/tiff'],
      captchaSiteKey: config.HCAPTCHA_SITE_KEY,
      oauthProviders: [
        ...(config.GOOGLE_CLIENT_ID ? ['google'] : []),
        ...(config.FACEBOOK_APP_ID ? ['facebook'] : []),
      ],
      locales: ['en', 'bg'],
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api', usersRouter);
  app.use('/api', categoriesRouter);
  app.use('/api', institutionsRouter);
  app.use('/api', complaintsRouter);
  app.use('/api', attachmentsRouter);
  app.use('/api', statisticsRouter);
  app.use('/api/admin', adminRouter);

  app.use(errorHandler);

  return app;
}
