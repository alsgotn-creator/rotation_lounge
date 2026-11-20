import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { computePlay } from '../../../../../lib/server/play';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 더블 최종 선택: 파트너에게 추천할 사람 저장 (통째로 바꿔 쓴다). 같이 앉았던 상대 팀의 나와 같은 성별만, 최대 rec.max 명.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  const p = me && (await participantOf(me.id));
  if (!p) return fail('입장 링크로 다시 들어와주세요.', 401);

  const { view } = await computePlay(event.id, p.id);
  const rec = view.choice?.rec;
  if (!rec) return fail('지금은 추천할 수 없어요.', 409);
  const b = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? [...new Set(b.ids.map(String))] as string[] : [];
  if (ids.length > rec.max) return fail(`최대 ${rec.max}명까지 추천할 수 있어요.`);
  if (ids.some((id) => !rec.options.some((o) => o.id === id))) return fail('추천할 수 없는 사람이 있어요.');

  const del = await db().from('recommends').delete().eq('event_id', event.id).eq('from_id', p.id);
  if (del.error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  if (ids.length) {
    const ins = await db().from('recommends').insert(ids.map((to) => ({ event_id: event.id, from_id: p.id, to_id: to })));
    if (ins.error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  }
  return NextResponse.json({ ok: true });
}
