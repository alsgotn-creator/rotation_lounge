import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie } from '../../../../../lib/server/invite';

// 연말 와인모임 단톡방 참가 신청: 입장 링크로 들어온 확정 참가자만. 이름·연락처·이메일은 신청 정보에서 호스트가 본다.
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return NextResponse.json({ ok: false, message: '행사를 찾지 못했어요.' }, { status: 404 });
  const me = await invitedFromCookie(event.id);
  if (!me) return NextResponse.json({ ok: false, message: '입장 링크로 다시 들어와주세요.' }, { status: 401 });
  const { error } = await db().from('wine_signups').upsert({ application_id: me.id, event_id: event.id }, { onConflict: 'application_id' });
  if (error) return NextResponse.json({ ok: false, message: '신청하지 못했어요. 다시 시도해주세요.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
