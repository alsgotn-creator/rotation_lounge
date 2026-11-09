import { NextResponse } from 'next/server';
import { db, hasDb } from '../../../lib/server/supabase';
import { signApp } from '../../../lib/server/auth';
import { inviteCookie } from '../../../lib/server/invite';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 랜딩의 '라운지 입장하기': 승인(확정)된 신청의 이메일만 넣으면 그 행사 라운지로 들어간다.
export async function POST(req: Request) {
  if (!hasDb()) return fail('지금은 입장할 수 없어요.', 503);
  const { email } = await req.json().catch(() => ({ email: '' }));
  const e = String(email ?? '').trim().toLowerCase().slice(0, 100);
  if (!e.includes('@')) return fail('이메일을 확인해주세요.');
  const { data } = await db().from('applications').select('id,events(id,slug,starts_at)').eq('email', e).eq('status', 'confirmed');
  const rows = (data ?? []).map((r) => ({ id: r.id as string, ev: r.events as unknown as { id: string; slug: string; starts_at: string } })).filter((r) => r.ev);
  if (!rows.length) return fail('승인된 신청을 찾지 못했어요. 신청할 때 쓴 이메일인지 확인해주세요.', 404);
  // 여러 번 참가했다면 아직 안 끝난(시작 12시간 전 이후) 가장 가까운 행사, 없으면 가장 최근 행사
  const since = Date.now() - 12 * 3600e3, t = (r: (typeof rows)[number]) => new Date(r.ev.starts_at).getTime();
  const pick = rows.filter((r) => t(r) >= since).sort((a, b) => t(a) - t(b))[0] ?? rows.sort((a, b) => t(b) - t(a))[0];
  const res = NextResponse.json({ ok: true, slug: pick.ev.slug });
  res.cookies.set({ name: inviteCookie(pick.ev.id), value: signApp(pick.id), httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 120 });
  return res;
}
