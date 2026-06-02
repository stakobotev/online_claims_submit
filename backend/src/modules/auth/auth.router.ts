import { Router, type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { config } from '../../config/index.js';
import { validate } from '../../middleware/validate.js';
import { requireCaptcha } from '../../middleware/captcha.js';
import { authRateLimit } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { findOrCreateOAuthUser } from './auth.service.js';
import { randomToken } from '../../lib/ids.js';

const OAUTH_STATE_COOKIE = 'oauth_state';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: config.NODE_ENV === 'production',
    maxAge: OAUTH_STATE_TTL_MS,
    path: '/',
  };
}

function startOAuth(strategy: 'google' | 'facebook', scope: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const state = randomToken(16);
    res.cookie(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions());
    passport.authenticate(strategy, { scope, session: false, state })(req, res, next);
  };
}

function verifyOAuthState(req: Request, res: Response, next: NextFunction) {
  const cookieState = req.cookies?.[OAUTH_STATE_COOKIE];
  const queryState = typeof req.query['state'] === 'string' ? req.query['state'] : undefined;
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });
  if (!cookieState || !queryState || cookieState !== queryState) {
    return res.redirect(`${config.PUBLIC_FRONTEND_URL}/auth/login?error=oauth_state_invalid`);
  }
  next();
}
import {
  register,
  verifyEmailHandler,
  resendVerificationHandler,
  login,
  refresh,
  logout,
  forgotPasswordHandler,
  resetPasswordHandler,
  oauthCallback,
  oauthExchange,
} from './auth.controller.js';
import {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  oauthExchangeSchema,
} from './auth.schemas.js';

if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_REDIRECT_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Google'));
          const fullName = extractProfileName(profile, email);
          const user = await findOrCreateOAuthUser('google', profile.id, email, fullName);
          done(null, { sub: user.id, email: user.email, role: user.role });
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}

if (config.FACEBOOK_APP_ID && config.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: config.FACEBOOK_APP_ID,
        clientSecret: config.FACEBOOK_APP_SECRET,
        callbackURL: config.FACEBOOK_REDIRECT_URL,
        profileFields: ['id', 'emails', 'displayName', 'name'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email from Facebook'));
          const fullName = extractProfileName(profile, email);
          const user = await findOrCreateOAuthUser('facebook', profile.id, email, fullName);
          done(null, { sub: user.id, email: user.email, role: user.role });
        } catch (err) {
          done(err as Error);
        }
      },
    ),
  );
}

function extractProfileName(
  profile: { displayName?: string; name?: { givenName?: string; familyName?: string } },
  email: string,
): string | undefined {
  const combined = [profile.name?.givenName, profile.name?.familyName]
    .filter((part): part is string => Boolean(part && part.trim()))
    .join(' ')
    .trim();
  const candidate = combined || profile.displayName?.trim() || '';
  if (!candidate || candidate.toLowerCase() === email.toLowerCase()) return undefined;
  return candidate;
}

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user as Express.User));

const router = Router();

router.post('/register', authRateLimit, validate(registerSchema), requireCaptcha(), register);
router.get('/verify-email', verifyEmailHandler);
router.post('/resend-verification', authRateLimit, validate(resendVerificationSchema), resendVerificationHandler);
router.post('/login', authRateLimit, validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', requireAuth, logout);
router.post('/forgot-password', authRateLimit, validate(forgotPasswordSchema), requireCaptcha(), forgotPasswordHandler);
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), resetPasswordHandler);

if (config.GOOGLE_CLIENT_ID) {
  router.get('/oauth/google', startOAuth('google', ['email', 'profile']));
  router.get(
    '/oauth/google/callback',
    verifyOAuthState,
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${config.PUBLIC_FRONTEND_URL}/auth/login?error=oauth_failed`,
    }),
    oauthCallback,
  );
}

if (config.FACEBOOK_APP_ID) {
  router.get('/oauth/facebook', startOAuth('facebook', ['email']));
  router.get(
    '/oauth/facebook/callback',
    verifyOAuthState,
    passport.authenticate('facebook', {
      session: false,
      failureRedirect: `${config.PUBLIC_FRONTEND_URL}/auth/login?error=oauth_failed`,
    }),
    oauthCallback,
  );
}

router.post('/oauth/exchange', validate(oauthExchangeSchema), oauthExchange);

export { router as authRouter };
