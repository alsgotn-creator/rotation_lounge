import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { computePlay } from '../../../../../lib/server/play';
import { ANSWER_MAX, drawCard, KINDS, type CardKind } from '../../../../../lib/domain/cards';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 페어 게임: draw(카드 뽑기, 같은 테이블 누구나) / answer(내 답). 지금 앉아 있는 테이블의 진행 중 라운드에서만.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  const p = me && (await participantOf(me.id));
  if (!p) return fail('입장 링크로 다시 들어와주세요.', 401);

  const { view, table } = await computePlay(event.id, p.id);
  if (!view.round || !table || view.round.partners.length === 0) return fail('지금은 게임을 할 수 없어요.', 409);
  const key = { event_id: event.id, round: view.round.no, table_no: table };
  const b = await req.json().catch(() => ({}));

  if (b.type === 'draw') {
    if (!KINDS.some((k) => k.kind === b.kind)) return fail('알 수 없는 카드 종류예요.');
    const card = drawCard(b.kind as CardKind, view.game?.cardId);
    const up = await db().from('game_plays').upsert({ ...key, card_id: card.id, drawn_by: p.id });
    if (up.error) return fail('카드를 뽑지 못했어요. 다시 시도해주세요.', 500);
    await db().from('game_answers').delete().match(key); // 새 카드면 이전 답은 지운다
    return NextResponse.json({ ok: true });
  }

  if (b.type === 'answer') {
    if (!view.game) return fail('먼저 카드를 뽑아주세요.', 409);
    const text = String(b.answer ?? '').trim();
    if (text.length < 1 || text.length > ANSWER_MAX) return fail(`1~${ANSWER_MAX}자로 적어주세요.`);
    if (view.game.options && !view.game.options.includes(text)) return fail('선택지에서 골라주세요.');
    const ins = await db().from('game_answers').insert({ ...key, participant_id: p.id, answer: text });
    if (ins.error?.code === '23505') return fail('이미 답했어요.', 409);
    if (ins.error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
    return NextResponse.json({ ok: true });
  }
  return fail('알 수 없는 요청이에요.');
}
