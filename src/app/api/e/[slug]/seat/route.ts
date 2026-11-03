import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { seatOpen } from '../../../../../lib/server/lounge';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 내 테이블 고르기 (시작 전 단계에서만). 같은 성별이 이미 고른 자리는 DB 고유 인덱스가 막는다.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent({ slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  const p = me && (await participantOf(me.id));
  if (!p) return fail('입장 링크로 다시 들어와주세요.', 401);

  const { data: ev } = await db().from('events').select('phase,table_count').eq('id', event.id).single();
  if (ev?.phase !== 'before') return fail('행사가 시작돼서 자리는 호스트가 바꿔드려요.', 409);
  if (!seatOpen(event.starts_at)) return fail('자리는 행사 당일, 테이블에 앉은 뒤 골라주세요.', 409);
  const { table } = await req.json().catch(() => ({ table: undefined }));
  if (table !== null && !(Number.isInteger(table) && table >= 1 && table <= ev.table_count)) return fail('테이블 번호를 확인해주세요.');

  const { error } = await db().from('participants').update({ number: table, updated_at: new Date().toISOString() }).eq('id', p.id);
  if (error?.code === '23505') return fail('이미 선택된 자리예요', 409);
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true });
}
