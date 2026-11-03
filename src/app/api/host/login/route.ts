import { NextResponse } from 'next/server';
import { checkHostPassword, hostCookie, HOST_COOKIE } from '../../../../lib/server/auth';

export async function POST(req: Request) {
  const f = await req.formData();
  const url = new URL('/host', req.url);
  if (f.get('logout')) {
    const res = NextResponse.redirect(url, 303);
    res.cookies.delete(HOST_COOKIE);
    return res;
  }
  if (!checkHostPassword(String(f.get('password') ?? ''))) {
    url.searchParams.set('e', '1');
    return NextResponse.redirect(url, 303);
  }
  const res = NextResponse.redirect(url, 303);
  res.cookies.set(hostCookie());
  return res;
}
