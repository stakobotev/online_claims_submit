import type { Request, Response, NextFunction } from 'express';
import {
  registerUser,
  verifyEmail,
  resendVerification,
  loginUser,
  refreshTokens,
  logoutUser,
  forgotPassword,
  resetPassword,
  refreshCookieOptions,
  issueOAuthExchangeCode,
  consumeOAuthExchangeCode,
} from './auth.service.js';
import { HttpError } from '../../middleware/errorHandler.js';
import { config } from '../../config/index.js';
import type { RegisterInput, LoginInput, ResetPasswordInput } from './auth.schemas.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await registerUser(
      req.body as RegisterInput,
      req.ip ?? undefined,
      req.headers['user-agent'],
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.query['token'] as string | undefined;
    if (!token) throw new HttpError(400, 'VALIDATION_ERROR', 'Token is required.');
    await verifyEmail(token);
    res.redirect(`${config.PUBLIC_FRONTEND_URL}/login?verified=1`);
  } catch (err) {
    next(err);
  }
}

export async function resendVerificationHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await resendVerification(email);
    res.json({ message: 'If an account with this email exists, a new verification email has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await loginUser(
      req.body as LoginInput,
      req.ip ?? undefined,
      req.headers['user-agent'],
    );
    res.cookie('refresh_token', result.refreshToken, refreshCookieOptions());
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawRefresh = req.cookies['refresh_token'] as string | undefined;
    if (!rawRefresh) throw new HttpError(401, 'AUTH_REQUIRED', 'Refresh token missing.');
    const tokens = await refreshTokens(rawRefresh, req.ip ?? undefined, req.headers['user-agent']);
    res.cookie('refresh_token', tokens.refreshToken, refreshCookieOptions());
    res.json({ accessToken: tokens.accessToken, user: tokens.user });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawRefresh = req.cookies['refresh_token'] as string | undefined;
    if (rawRefresh) await logoutUser(rawRefresh, req.ip ?? undefined, req.headers['user-agent']);
    res.clearCookie('refresh_token', { path: '/' });
    res.status(200).json({ message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    await forgotPassword(email);
    res.json({ message: 'If an account with this email exists, a password reset email has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = req.body as ResetPasswordInput;
    await resetPassword(body.token, body.password);
    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
}

export async function oauthCallback(req: Request, res: Response): Promise<void> {
  const user = req.user as { sub: string; email: string; role: 'admin' | 'user' } | undefined;
  if (!user) {
    res.redirect(`${config.PUBLIC_FRONTEND_URL}/login?error=oauth_failed`);
    return;
  }

  const code = await issueOAuthExchangeCode(user.sub);
  res.redirect(`${config.PUBLIC_FRONTEND_URL}/oauth/callback?code=${code}`);
}

export async function oauthExchange(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.body as { code: string };
    const result = await consumeOAuthExchangeCode(code, req.ip ?? undefined, req.headers['user-agent']);
    res.cookie('refresh_token', result.refreshToken, refreshCookieOptions());
    res.json({ accessToken: result.accessToken, user: result.user });
  } catch (err) {
    next(err);
  }
}
