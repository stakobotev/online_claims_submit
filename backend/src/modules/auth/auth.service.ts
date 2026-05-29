import { createHash } from 'node:crypto';
import { prisma } from '../../prisma.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt.js';
import { randomToken, hashToken } from '../../lib/ids.js';
import { enqueueMail } from '../email/email.service.js';
import { storeConsent } from '../consents/consents.service.js';
import { audit } from '../auditLog/auditLog.service.js';
import { config } from '../../config/index.js';
import { HttpError } from '../../middleware/errorHandler.js';
import type { RegisterInput, LoginInput } from './auth.schemas.js';
import type { OAuthProvider } from '@prisma/client';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOGIN_LOCKOUT_THRESHOLD = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    maxAge: REFRESH_TTL_MS,
    path: '/',
  };
}

export { refreshCookieOptions };

export async function registerUser(
  input: RegisterInput,
  ipAddress?: string,
  userAgent?: string,
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new HttpError(409, 'CONFLICT', 'An account with this email already exists.');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      status: 'pending_confirmation',
      emailVerified: false,
    },
  });

  await storeConsent({ userId: user.id, document: 'terms', version: input.consents.termsVersion, ipAddress, userAgent });
  await storeConsent({ userId: user.id, document: 'privacy', version: input.consents.privacyVersion, ipAddress, userAgent });
  if (input.consents.marketing) {
    await storeConsent({ userId: user.id, document: 'marketing', version: '1.0', ipAddress, userAgent });
  }

  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${config.PUBLIC_BACKEND_URL}/api/auth/verify-email?token=${rawToken}`;
  await enqueueMail({
    template: 'auth.verify_email',
    to: user.email,
    subject: 'Verify your Vallentin Claims account',
    data: { name: user.name ?? user.email, verifyUrl },
    relatedUserId: user.id,
  });

  await audit({ actorId: user.id, event: 'auth.register', ipAddress, userAgent });

  return { userId: user.id, status: user.status };
}

export async function verifyEmail(rawToken: string): Promise<{ status: string }> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid or expired verification token.');
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { status: 'active', emailVerified: true },
    }),
  ]);

  await audit({ actorId: record.userId, event: 'auth.email_verified' });

  return { status: 'active' };
}

export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'pending_confirmation') return;

  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${config.PUBLIC_BACKEND_URL}/api/auth/verify-email?token=${rawToken}`;
  await enqueueMail({
    template: 'auth.verify_email',
    to: user.email,
    subject: 'Verify your Vallentin Claims account',
    data: { name: user.name ?? user.email, verifyUrl },
    relatedUserId: user.id,
  });
}

export async function loginUser(
  input: LoginInput,
  ipAddress?: string,
  userAgent?: string,
) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const badCreds = new HttpError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid email or password.');

  if (!user || !user.passwordHash) {
    await audit({ event: 'auth.login.failed', ipAddress, userAgent, metadata: { email: input.email } });
    throw badCreds;
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    await audit({ actorId: user.id, event: 'auth.login.locked', ipAddress, userAgent });
    throw badCreds;
  }

  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) {
    const incremented = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    let lockedUntil: Date | null = null;
    if (incremented.failedLoginCount >= LOGIN_LOCKOUT_THRESHOLD) {
      lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_MS);
      await prisma.user.update({ where: { id: user.id }, data: { lockedUntil } });
    }
    await audit({
      actorId: user.id,
      event: lockedUntil ? 'auth.login.locked' : 'auth.login.failed',
      ipAddress,
      userAgent,
      metadata: lockedUntil ? { lockedUntil: lockedUntil.toISOString() } : undefined,
    });
    throw badCreds;
  }

  if (user.status !== 'active') {
    throw new HttpError(403, 'FORBIDDEN', `Account is ${user.status}.`);
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const rawRefresh = signRefreshToken(user.id);
  const refreshHash = createHash('sha256').update(rawRefresh).digest('hex');

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshHash,
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
        ipAddress: ipAddress ?? '',
        userAgent: userAgent ?? '',
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
    }),
  ]);

  await audit({ actorId: user.id, event: 'auth.login.succeeded', ipAddress, userAgent });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function refreshTokens(rawRefresh: string, ipAddress?: string, userAgent?: string) {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(rawRefresh);
  } catch {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Invalid refresh token.');
  }

  const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
  const stored = await prisma.refreshToken.findFirst({
    where: { tokenHash, userId: payload.sub },
  });

  if (!stored) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Refresh token not recognized.');
  }

  if (stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: payload.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await audit({
      actorId: payload.sub,
      event: 'auth.refresh.reuse_detected',
      ipAddress,
      userAgent,
      metadata: { revokedTokenId: stored.id },
    });
    throw new HttpError(401, 'AUTH_REQUIRED', 'Refresh token has been revoked.');
  }

  if (stored.expiresAt < new Date()) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Refresh token expired.');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || user.status !== 'active') {
    throw new HttpError(401, 'AUTH_REQUIRED', 'User account not active.');
  }

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });

  const newRawRefresh = signRefreshToken(user.id);
  const newHash = createHash('sha256').update(newRawRefresh).digest('hex');
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      ipAddress: stored.ipAddress,
      userAgent: stored.userAgent,
    },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  return {
    accessToken,
    refreshToken: newRawRefresh,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function logoutUser(rawRefresh: string, ipAddress?: string, userAgent?: string): Promise<void> {
  let payload: { sub: string };
  try {
    payload = verifyRefreshToken(rawRefresh);
  } catch {
    return;
  }
  const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
  await prisma.refreshToken.updateMany({
    where: { tokenHash, userId: payload.sub },
    data: { revokedAt: new Date() },
  });
  await audit({ actorId: payload.sub, event: 'auth.logout', ipAddress, userAgent });
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status !== 'active') return;

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  const rawToken = randomToken();
  const tokenHash = hashToken(rawToken);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  const resetUrl = `${config.PUBLIC_FRONTEND_URL}/reset-password?token=${rawToken}`;
  await enqueueMail({
    template: 'auth.password_reset',
    to: user.email,
    subject: 'Reset your Vallentin Claims password',
    data: { name: user.name ?? user.email, resetUrl },
    relatedUserId: user.id,
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!record || record.consumedAt || record.expiresAt < new Date()) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid or expired reset token.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await audit({ actorId: record.userId, event: 'auth.password_reset' });
}

const OAUTH_EXCHANGE_TTL_MS = 60_000;

export async function issueOAuthExchangeCode(userId: string): Promise<string> {
  const raw = randomToken(16);
  await prisma.oAuthExchangeCode.create({
    data: {
      code: hashToken(raw),
      userId,
      expiresAt: new Date(Date.now() + OAUTH_EXCHANGE_TTL_MS),
    },
  });
  return raw;
}

export async function consumeOAuthExchangeCode(
  raw: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const code = hashToken(raw);
  const claimed = await prisma.oAuthExchangeCode.updateMany({
    where: { code, consumedAt: null, expiresAt: { gt: new Date() } },
    data: { consumedAt: new Date() },
  });
  if (claimed.count === 0) {
    throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid or expired exchange code.');
  }

  const record = await prisma.oAuthExchangeCode.findUnique({ where: { code } });
  if (!record) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid or expired exchange code.');

  const user = await prisma.user.findUnique({ where: { id: record.userId } });
  if (!user) throw new HttpError(404, 'NOT_FOUND', 'User not found.');

  const accessToken = signAccessToken({ sub: user.id, role: user.role, email: user.email });
  const rawRefresh = signRefreshToken(user.id);
  const refreshHash = createHash('sha256').update(rawRefresh).digest('hex');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      ipAddress: ipAddress ?? '',
      userAgent: userAgent ?? '',
    },
  });

  return {
    accessToken,
    refreshToken: rawRefresh,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

export async function findOrCreateOAuthUser(
  provider: OAuthProvider,
  providerUserId: string,
  email: string,
  name?: string,
) {
  const existing = await prisma.oAuthIdentity.findUnique({
    where: { provider_providerUserId: { provider, providerUserId } },
    include: { user: true },
  });

  if (existing) return existing.user;

  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) {
    if (!existingByEmail.emailVerified) {
      await audit({
        actorId: existingByEmail.id,
        event: 'auth.oauth.link_blocked',
        metadata: { provider, reason: 'local_account_unverified' },
      });
      throw new HttpError(401, 'AUTH_FAILED', 'Sign-in failed.');
    }
    await prisma.oAuthIdentity.upsert({
      where: { provider_providerUserId: { provider, providerUserId } },
      update: {},
      create: { userId: existingByEmail.id, provider, providerUserId },
    });
    return existingByEmail;
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: name ?? null,
      status: 'active',
      emailVerified: true,
      oauthIdentities: {
        connectOrCreate: {
          where: { provider_providerUserId: { provider, providerUserId } },
          create: { provider, providerUserId },
        },
      },
    },
  });

  return user;
}
