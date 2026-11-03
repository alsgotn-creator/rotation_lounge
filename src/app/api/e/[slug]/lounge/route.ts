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
  const p = me && (await participantOf(me.id));
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true, view: await loungeView(event.id, p.id) }, { headers: { 'cache-control': 'no-store' } });
}
