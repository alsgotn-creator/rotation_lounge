import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie } from '../../../../../lib/server/invite';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 후기 남기기: 입장 링크로 들어온 확정 참가자, 행사당 한 번(다시 쓰면 고쳐 쓴다). 마무리 단계에서만.
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  if (!me) return fail('입장 링크로 다시 들어와주세요.', 401);
  const { data: ev } = await db().from('events').select('phase').eq('id', event.id).maybeSingle();
  if (ev?.phase !== 'closing') return fail('후기는 행사가 끝난 뒤에 남길 수 있어요.', 409);

  const j = await req.json().catch(() => ({}));
  const body = String(j.body ?? '').trim();
  if (body.length < 1 || body.length > 120) return fail('1~120자로 적어주세요.');
  const rating = j.rating == null ? 5 : Number(j.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail('별점을 골라주세요.');

  const age = new Date(event.starts_at).getUTCFullYear() - me.birth_year;
  const row = { application_id: me.id, event_id: event.id, gender: me.gender, age, body };
  let { error } = await db().from('reviews').upsert({ ...row, rating }, { onConflict: 'application_id' });
  // rating 칸이 아직 없으면(0015 전) 별점 없이 저장
  if (error && /rating/.test(error.message)) ({ error } = await db().from('reviews').upsert(row, { onConflict: 'application_id' }));
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true });
}
