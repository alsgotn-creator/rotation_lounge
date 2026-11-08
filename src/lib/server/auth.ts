import 'server-only';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const newToken = () => randomBytes(24).toString('base64url');
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');

export const HOST_COOKIE = 'fl_host';
const hostValue = () => createHmac('sha256', process.env.HOST_PASSWORD ?? '').update('host').digest('hex');

export function checkHostPassword(pw: string) {
  const want = process.env.HOST_PASSWORD;
  if (!want) return false;
  const a = Buffer.from(hash(pw)), b = Buffer.from(hash(want));
  return timingSafeEqual(a, b);
}
export const hostCookie = () => ({ name: HOST_COOKIE, value: hostValue(), httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 12 });

export async function isHost() {
  if (process.env.HOST_OPEN === '1') return true; // shortcut: 시연용 임시 개방. 행사 전에 Vercel에서 HOST_OPEN 값을 지울 것
  if (!process.env.HOST_PASSWORD) return false;
  const v = (await cookies()).get(HOST_COOKIE)?.value ?? '';
  const a = Buffer.from(v), b = Buffer.from(hostValue());
  return a.length === b.length && timingSafeEqual(a, b);
}
