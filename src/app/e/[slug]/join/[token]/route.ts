import { NextResponse } from 'next/server';
import { getEvent } from '../../../../../lib/server/signup';
import { findInvited, inviteCookie } from '../../../../../lib/server/invite';

// 입장 링크를 열면 쿠키를 심고 라운지로 보낸다. 다른 기기에서도 같은 링크로 다시 들어올 수 있다.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const url = new URL(`/e/${slug}`, req.url);
  const event = await getEvent({ slug });
  if (!event || !(await findInvited(event.id, token))) {
    url.searchParams.set('bad', '1');
    return NextResponse.redirect(url, 303);
  }
  const res = NextResponse.redirect(url, 303);
  res.cookies.set({ name: inviteCookie(event.id), value: token, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: `/e/${slug}`, maxAge: 60 * 60 * 24 * 120 });
  return res;
}
