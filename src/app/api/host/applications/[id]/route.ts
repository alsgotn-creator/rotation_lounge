import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { hash, isHost, newToken } from '../../../../../lib/server/auth';
import { getEvent } from '../../../../../lib/server/signup';
import { paymentDue, pickNumber, seatsLeft, type AppStatus, type Gender } from '../../../../../lib/signup/rules';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// 어떤 상태에서 어떤 버튼이 가능한지
const FROM: Record<string, AppStatus[]> = {
  approve: ['new', 'held'],          // → 입금 대기
  paid: ['awaiting_payment'],        // → 확정 + 입장 링크
  relink: ['confirmed'],             // 입장 링크 새로 만들기 (이전 링크는 못 씀)
  hold: ['new', 'awaiting_payment'], // → 대기
  cancel: ['new', 'held', 'awaiting_payment', 'confirmed'],
  restore: ['cancelled'],            // → 새 신청
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isHost())) return fail('다시 로그인해주세요.', 401);
  const { id } = await params;
  const { action } = await req.json().catch(() => ({ action: '' }));
  if (!FROM[action]) return fail('알 수 없는 동작이에요.');

  const { data: app } = await db().from('applications').select('id,event_id,gender,status,number').eq('id', id).maybeSingle();
  if (!app) return fail('신청을 찾지 못했어요.', 404);
  if (!FROM[action].includes(app.status)) return fail('지금 상태에서는 할 수 없어요. 새로고침해주세요.', 409);
  const event = await getEvent({ id: app.event_id });
  if (!event) return fail('일정을 찾지 못했어요.', 404);

  const now = new Date();
  const patch: Record<string, unknown> = { updated_at: now.toISOString() };
  let inviteToken: string | undefined;

  if (action === 'approve') {
    const { data: rows } = await db().from('applications').select('gender,status').eq('event_id', event.id);
    if (seatsLeft(event.capacity_per_gender, (rows ?? []) as { gender: Gender; status: AppStatus }[], app.gender) === 0)
      return fail('이 성별은 자리가 다 찼어요. 대기로 두세요.');
    patch.status = 'awaiting_payment';
    patch.payment_due = paymentDue(now, event.starts_at, event.payment_due_days);
  }
  if (action === 'paid' || action === 'relink') {
    inviteToken = newToken();
    patch.status = 'confirmed';
    patch.invite_token_hash = hash(inviteToken);
  }
  // 참가 확정 때 호 번호를 무작위로 (같은 성별의 빈 번호 중에서). 1라운드는 같은 번호끼리 같은 테이블.
  if (action === 'paid' && app.number == null) {
    const { data: rows } = await db().from('applications').select('number').eq('event_id', event.id).eq('gender', app.gender).not('number', 'is', null);
    const n = pickNumber((rows ?? []).map((r) => r.number as number), event.capacity_per_gender);
    if (n == null) return fail('이 성별의 호 번호가 다 찼어요.');
    patch.number = n;
  }
  if (action === 'hold') patch.status = 'held';
  if (action === 'cancel') { patch.status = 'cancelled'; patch.invite_token_hash = null; patch.number = null; }
  if (action === 'restore') patch.status = 'new';

  const { error } = await db().from('applications').update(patch).eq('id', id).eq('status', app.status);
  if (error?.code === '23505') return fail('동시에 같은 번호가 잡혔어요. 한 번 더 눌러주세요.', 409);
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  // 이미 사전 등록한 참가자의 번호도 같이 맞춘다
  if ('number' in patch) await db().from('participants').update({ number: patch.number }).eq('application_id', id);
  return NextResponse.json({ ok: true, status: patch.status ?? app.status, paymentDue: patch.payment_due ?? null, inviteToken, number: patch.number ?? app.number ?? null });
}
