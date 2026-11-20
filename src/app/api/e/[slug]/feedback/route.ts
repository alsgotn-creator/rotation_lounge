import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie } from '../../../../../lib/server/invite';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 호스트에게 하고 싶은 말 (모임 피드백 · 요청사항). 마무리 단계에서만, 참가자당 하나(다시 쓰면 고쳐 쓴다). 호스트만 본다.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  if (!me) return fail('입장 링크로 다시 들어와주세요.', 401);
  const { data: ev } = await db().from('events').select('phase').eq('id', event.id).maybeSingle();
  if (ev?.phase !== 'closing') return fail('모임이 끝난 뒤에 남길 수 있어요.', 409);
  const j = await req.json().catch(() => ({}));
  const body = String(j.body ?? '').trim();
  if (body.length < 1 || body.length > 300) return fail('1~300자로 적어주세요.');
  const { error } = await db().from('host_feedback').upsert({ application_id: me.id, event_id: event.id, body, created_at: new Date().toISOString() }, { onConflict: 'application_id' });
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true });
}
