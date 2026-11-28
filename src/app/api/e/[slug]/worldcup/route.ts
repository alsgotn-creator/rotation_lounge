import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { WC, wcResultError } from '../../../../../lib/domain/worldcup';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

/** 이상형 월드컵 결과 저장 (사전 등록을 마친 참가자만). 다시 하면 덮어쓴다 */
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  if (!me) return fail('입장 링크로 다시 들어와주세요.', 401);
  const p = await participantOf(me.id);
  if (!p) return fail('먼저 프로필을 저장해주세요.', 409);
  const b = await req.json().catch(() => null);
  const err = wcResultError(b, WC[me.gender === 'f' ? 'm' : 'f']);
  if (err) return fail(err);
  const { error } = await db().from('participants').update({ worldcup: { winner: b.winner, order: b.order } }).eq('id', p.id);
  if (error) return fail('저장하지 못했어요. 호스트에게 알려주세요. (0023 마이그레이션 필요)', 500);
  return NextResponse.json({ ok: true });
}
