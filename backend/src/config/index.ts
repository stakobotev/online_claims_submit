import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),

  PUBLIC_FRONTEND_URL: z.string().url(),
  PUBLIC_BACKEND_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  ARGON2_MEMORY_COST: z.coerce.number().default(19456),
  ARGON2_TIME_COST: z.coerce.number().default(2),
  ARGON2_PARALLELISM: z.coerce.number().default(1),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URL: z.string().default(''),
  FACEBOOK_APP_ID: z.string().default(''),
  FACEBOOK_APP_SECRET: z.string().default(''),
  FACEBOOK_REDIRECT_URL: z.string().default(''),

  HCAPTCHA_SITE_KEY: z.string().default(''),
  HCAPTCHA_SECRET: z.string().default(''),

  SMTP_HOST: z.string().default('mailhog'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_SECURE: z.string().transform((v) => v === 'true').default('false'),
  MAIL_FROM: z.string().default('Vallentin Claims <no-reply@vallentin.local>'),

  OMBUDSMAN_EMAIL: z.string().email(),

  ADMIN_EMAIL: z.string().email(),
  ADMIN_INITIAL_PASSWORD: z.string().min(1),
  SEED_DEMO_DATA: z.string().transform((v) => v === 'true').default('false'),

  UPLOAD_DIR: z.string().default('/var/app/uploads'),
  MAX_ATTACHMENTS: z.coerce.number().default(3),
  MAX_ATTACHMENT_TOTAL_BYTES: z.coerce.number().default(5242880),
  MAX_ATTACHMENT_FILE_BYTES: z.coerce.number().default(5242880),

  RATE_LIMIT_GLOBAL: z.coerce.number().default(300),
  RATE_LIMIT_AUTH: z.coerce.number().default(10),
  RATE_LIMIT_COMPLAINT_SUBMIT: z.coerce.number().default(10),

  MIN_BODY_LENGTH: z.coerce.number().default(100),
  SUBMISSION_FORWARD_DEADLINE_SECONDS: z.coerce.number().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const PLACEHOLDER_SECRETS: ReadonlyArray<[keyof typeof parsed.data, string]> = [
  ['JWT_ACCESS_SECRET', 'replace-me-access'],
  ['JWT_REFRESH_SECRET', 'replace-me-refresh'],
  ['ADMIN_INITIAL_PASSWORD', 'ChangeMe!Now1'],
  ['HCAPTCHA_SECRET', '0x0000000000000000000000000000000000000000'],
];

if (parsed.data.NODE_ENV === 'production') {
  const matches = PLACEHOLDER_SECRETS.filter(([k, v]) => parsed.data[k] === v).map(([k]) => k);
  if (matches.length > 0) {
    console.error(`Refusing to start in production with placeholder secret(s): ${matches.join(', ')}`);
    process.exit(1);
  }
}

export const config = parsed.data;
export type Config = typeof config;
