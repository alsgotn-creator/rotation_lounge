import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { invitedFromCookie } from '../../../../../lib/server/invite';
import { getEvent } from '../../../../../lib/server/signup';
import { registrationError, type RegistrationInput } from '../../../../../lib/domain/register';
import { loveType } from '../../../../../lib/domain/loveType';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent({ slug });
  if (!event) return fail('행사를 찾지 못했어요.', 404);
  const me = await invitedFromCookie(event.id);
  if (!me) return fail('입장 링크로 다시 들어와주세요.', 401);

  const { data: ev } = await db().from('events').select('phase').eq('id', event.id).single();
  if (ev?.phase !== 'before' && !slug.startsWith('demo-')) return fail('행사가 시작돼서 지금은 고칠 수 없어요.', 409); // 시연 모임은 진행 중에도 새로 등록할 수 있다

  const b = (await req.json().catch(() => ({}))) as RegistrationInput;
  const err = registrationError(b);
  if (err) return fail(err);

  const now = new Date().toISOString();
  const row = {
    event_id: event.id, application_id: me.id, gender: me.gender, job: me.job, number: me.number,
    age: Math.min(new Date(event.starts_at).getUTCFullYear(), new Date().getUTCFullYear() + 1) - me.birth_year, // 시연 모임(9999년)에서 나이가 튀지 않게
    nickname: '', area: b.area.trim(), mbti: b.mbti.toUpperCase(),
    keywords: b.keywords.map((k) => k.trim()).filter(Boolean),
    answers: b.answers, love_type: loveType(b.answers), shape: b.shape, prop: b.prop || 'none',
    consent_at: now, updated_at: now,
  };
  const { error } = await db().from('participants').upsert(row, { onConflict: 'application_id' });
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true, loveType: row.love_type });
}
