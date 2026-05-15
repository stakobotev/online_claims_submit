import nodemailer from 'nodemailer';
import { prisma } from '../../prisma.js';
import { fetchPendingEmails, markSent, markFailed } from './outbox.repository.js';
import { config } from '../../config/index.js';
import { logger } from '../../lib/logger.js';

const ADVISORY_LOCK_KEY = 9_876_543_210n;
const POLL_INTERVAL_MS = 15_000;

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  ...(config.SMTP_USER
    ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }
    : {}),
});

async function tryAcquireLock(): Promise<boolean> {
  const result = await prisma.$queryRawUnsafe<Array<{ pg_try_advisory_lock: boolean }>>(
    `SELECT pg_try_advisory_lock($1)`,
    ADVISORY_LOCK_KEY,
  );
  return result[0]?.pg_try_advisory_lock === true;
}

async function releaseLock(): Promise<void> {
  await prisma.$queryRawUnsafe(`SELECT pg_advisory_unlock($1)`, ADVISORY_LOCK_KEY);
}

async function processEmails(): Promise<void> {
  const hasLock = await tryAcquireLock();
  if (!hasLock) return;

  try {
    const emails = await fetchPendingEmails(20);
    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: email.fromAddress,
          to: email.toAddress,
          subject: email.subject,
          html: email.bodyHtml,
          text: email.bodyText,
        });
        await markSent(email.id);
        logger.info({ emailId: email.id, template: email.template }, 'Email sent');
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await markFailed(email.id, email.attempts, errMsg);
        logger.warn({ emailId: email.id, err: errMsg }, 'Email send failed');

        if (email.attempts + 1 >= 5) {
          logger.error({ emailId: email.id, template: email.template }, 'Email moved to dead letter');
        }
      }
    }
  } finally {
    await releaseLock();
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startEmailWorker(): void {
  if (config.NODE_ENV === 'test') return;
  intervalHandle = setInterval(() => {
    processEmails().catch((err) => logger.error({ err }, 'Email worker error'));
  }, POLL_INTERVAL_MS);

  if (intervalHandle.unref) intervalHandle.unref();
  logger.info('Email worker started');
}

export function stopEmailWorker(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  releaseLock().catch(() => undefined);
}
