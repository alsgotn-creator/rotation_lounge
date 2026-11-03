import { NextResponse } from 'next/server';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { computePlay } from '../../../../../lib/server/play';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });
  const me = await invitedFromCookie(event.id);
  const p = me && (await participantOf(me.id));
  if (!p) return NextResponse.json({ ok: false }, { status: 401 });
  const { view } = await computePlay(event.id, p.id);
  return NextResponse.json({ ok: true, view }, { headers: { 'cache-control': 'no-store' } });
}
