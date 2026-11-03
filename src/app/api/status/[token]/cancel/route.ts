import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { hash } from '../../../../../lib/server/auth';

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // 확정 전까지만 본인이 취소할 수 있다 (확정 뒤에는 환불 규정 때문에 호스트가 처리)
  const { data, error } = await db().from('applications')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('status_token_hash', hash(token)).in('status', ['new', 'held', 'awaiting_payment']).select('id');
  if (error || !data?.length) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
