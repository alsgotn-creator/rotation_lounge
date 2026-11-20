import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie } from '../../../../../lib/server/invite';
import { CLOSING_KINDS, type ClosingKind } from '../../../../../lib/domain/closing';

export const dynamic = 'force-dynamic';
const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

async function who(slug: string) {
  const event = await getEvent({ slug });
  if (!event) return null;
  const me = await invitedFromCookie(event.id);
  return me ? { event, me } : null;
}

// 내가 이미 누른 신청들
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const x = await who((await params).slug);
  if (!x) return fail('입장 링크로 다시 들어와주세요.', 401);
  const { data, error } = await db().from('closing_signups').select('kind').eq('event_id', x.event.id).eq('application_id', x.me.id);
  return NextResponse.json({ ok: true, kinds: error ? [] : (data ?? []).map((r) => r.kind as ClosingKind) }, { headers: { 'cache-control': 'no-store' } });
}

// {kind, on} 신청하기 / 취소하기. 마무리 단계에서만. 이름·연락처는 신청 정보에서 호스트가 본다.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const x = await who((await params).slug);
  if (!x) return fail('입장 링크로 다시 들어와주세요.', 401);
  const { data: ev } = await db().from('events').select('phase').eq('id', x.event.id).maybeSingle();
  if (ev?.phase !== 'closing') return fail('모임이 끝난 뒤에 신청할 수 있어요.', 409);
  const b = await req.json().catch(() => ({}));
  const kind = String(b.kind) as ClosingKind;
  if (!CLOSING_KINDS.includes(kind)) return fail('알 수 없는 신청이에요.');
  const { error } = b.on === false
    ? await db().from('closing_signups').delete().eq('application_id', x.me.id).eq('kind', kind)
    : await db().from('closing_signups').upsert({ application_id: x.me.id, event_id: x.event.id, kind }, { onConflict: 'application_id,kind' });
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true });
}
