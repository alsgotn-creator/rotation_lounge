import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { computePlay } from '../../../../../lib/server/play';
import { containsContact, NOTE_MAX } from '../../../../../lib/domain/notes';

const fail = (message: string, status = 400, code?: string) => NextResponse.json({ ok: false, message, code }, { status });

// 롤링페이퍼 남기기/건너뛰기. 지금 써야 하는 것(pending)과 일치할 때만 저장한다.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  const p = me && (await participantOf(me.id));
  if (!p) return fail('입장 링크로 다시 들어와주세요.', 401);

  const b = await req.json().catch(() => ({}));
  const round = Number(b.round), toId = String(b.toId ?? '');
  const raw = b.body === null || b.body === undefined ? null : String(b.body).trim();
  if (raw !== null) {
    if (raw.length < 1 || raw.length > NOTE_MAX) return fail(`1~${NOTE_MAX}자로 적어주세요.`);
    if (containsContact(raw)) return fail('연락처로 보이는 내용이 있어요', 400, 'contact_info');
  }
  const { pendingAll } = await computePlay(event.id, p.id);
  if (!pendingAll.some((x) => x.round === round && x.toId === toId)) return fail('이미 남겼거나, 지금 쓸 수 없는 쪽지예요.', 409);

  const { error } = await db().from('notes').insert({ event_id: event.id, round, from_id: p.id, to_id: toId, body: raw });
  if (error?.code === '23505') return NextResponse.json({ ok: true });
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true });
}
