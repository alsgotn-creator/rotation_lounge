import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { computePlay } from '../../../../../lib/server/play';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 최종 선택 저장. 최종 선택 단계에서만, 고른 사람은 이성 착석자여야 하고 최대 인원을 넘을 수 없다. 단계가 끝나기 전까지 고칠 수 있다.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  const p = me && (await participantOf(me.id));
  if (!p) return fail('입장 링크로 다시 들어와주세요.', 401);

  const { view, opposite } = await computePlay(event.id, p.id);
  if (!view.choice) return fail('지금은 선택할 수 없어요.', 409);
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? [...new Set(b.ids.map(String))] as string[] : [];
  if (ids.length > view.choice.max) return fail(`최대 ${view.choice.max}명까지 고를 수 있어요.`);
  const ok = new Set(opposite.map((o) => o.id));
  if (ids.some((id) => !ok.has(id))) return fail('고를 수 없는 사람이 있어요.');

  const del = await db().from('choices').delete().eq('event_id', event.id).eq('from_id', p.id);
  if (del.error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  if (ids.length) {
    const ins = await db().from('choices').insert(ids.map((to) => ({ event_id: event.id, from_id: p.id, to_id: to })));
    if (ins.error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  }
  await db().from('participants').update({ choice_done_at: new Date().toISOString() }).eq('id', p.id); // 칸이 없으면 무시된다
  return NextResponse.json({ ok: true });
}
