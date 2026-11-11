import { NextResponse } from 'next/server';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { loungeView } from '../../../../../lib/server/lounge';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEvent({ slug });
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });
  const me = await invitedFromCookie(event.id);
  if (!me) return NextResponse.json({ ok: false }, { status: 401 });
  const [p, view] = await Promise.all([participantOf(me.id), loungeView(event.id, me.id)]); // 4초마다 부르는 길이라 한 번에
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, view }, { headers: { 'cache-control': 'no-store' } });
}
