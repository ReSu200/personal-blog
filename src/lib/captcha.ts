import crypto from 'node:crypto';

export const CAPTCHA_COOKIE = 'blog_captcha';
export const CAPTCHA_TTL_MS = 5 * 60 * 1000;

const secret = process.env.AUTH_SECRET || 'dev-secret-change-me';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function createCaptchaCode(length = 4) {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

function sign(payload: string) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32);
}

/** 生成带过期时间与 HMAC 签名的 cookie 值 */
export function signCaptcha(code: string) {
  const expires = Date.now() + CAPTCHA_TTL_MS;
  const payload = `${code}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyCaptcha(cookieValue: string | undefined | null, input: string) {
  if (!cookieValue || !input) return false;
  const parts = cookieValue.split('.');
  if (parts.length !== 3) return false;

  const [code, expires, signature] = parts;
  const payload = `${code}.${expires}`;
  const expected = sign(payload);

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return false;
  }
  if (Date.now() > Number(expires)) return false;

  return code.toUpperCase() === input.trim().toUpperCase();
}

const COLORS = ['#0f766e', '#c2410c', '#6d28d9', '#1d4ed8', '#be185d', '#15803d'];

/** 生成带干扰线与噪点的验证码 SVG */
export function renderCaptchaSvg(code: string) {
  const chars = code
    .split('')
    .map((char, index) => {
      const x = 14 + index * 25;
      const y = 30 + (Math.random() * 6 - 3);
      const rotate = Math.random() * 30 - 15;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return `<text x="${x}" y="${y.toFixed(1)}" font-size="26" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="${color}" transform="rotate(${rotate.toFixed(1)} ${x} ${y.toFixed(1)})">${char}</text>`;
    })
    .join('');

  const lines = Array.from({ length: 4 })
    .map(() => {
      const x1 = (Math.random() * 120).toFixed(1);
      const y1 = (Math.random() * 44).toFixed(1);
      const x2 = (Math.random() * 120).toFixed(1);
      const y2 = (Math.random() * 44).toFixed(1);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1" opacity="0.45"/>`;
    })
    .join('');

  const dots = Array.from({ length: 18 })
    .map(() => {
      const cx = (Math.random() * 120).toFixed(1);
      const cy = (Math.random() * 44).toFixed(1);
      return `<circle cx="${cx}" cy="${cy}" r="1" fill="#94a3b8" opacity="0.35"/>`;
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="44" viewBox="0 0 120 44" role="img" aria-label="验证码"><rect width="120" height="44" rx="8" fill="#f1f5f9"/>${lines}${dots}${chars}</svg>`;
}
