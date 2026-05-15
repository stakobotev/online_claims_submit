import { config } from '../config/index.js';

const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';

export async function verifyHCaptcha(token: string, remoteIp?: string): Promise<boolean> {
  if (config.NODE_ENV === 'test') return true;

  const params = new URLSearchParams({
    secret: config.HCAPTCHA_SECRET,
    response: token,
    ...(remoteIp ? { remoteip: remoteIp } : {}),
  });

  const resp = await fetch(HCAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!resp.ok) return false;

  const data = (await resp.json()) as { success: boolean };
  return data.success === true;
}
