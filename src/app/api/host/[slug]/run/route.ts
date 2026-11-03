import { NextResponse } from 'next/server';
import { isHost } from '../../../../../lib/server/auth';
import { getEvent } from '../../../../../lib/server/signup';
import { loadRun, runHostCmd, tablePairs, type HostCmd } from '../../../../../lib/server/run';

export const dynamic = 'force-dynamic';
const nope = () => NextResponse.json({ ok: false, message: '다시 로그인해주세요.' }, { status: 401 });

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isHost())) return nope();
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });
  const run = await loadRun(event.id);
  return NextResponse.json({ ok: true, serverNow: Date.now(), view: { ...run, pairs: tablePairs(run) } }, { headers: { 'cache-control': 'no-store' } });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!(await isHost())) return nope();
  const event = await getEvent({ slug: (await params).slug });
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });
  const cmd = (await req.json().catch(() => null)) as HostCmd | null;
  if (!cmd?.type) return NextResponse.json({ ok: false, message: '알 수 없는 명령이에요.' }, { status: 400 });
  const r = await runHostCmd(event.id, cmd);
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
