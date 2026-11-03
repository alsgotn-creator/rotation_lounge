import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getEvent } from '../../../../lib/server/signup';
import { loadRun, tablePairs, type Person } from '../../../../lib/server/run';

export const dynamic = 'force-dynamic';

// 큰 화면: 닉네임·이름 없이 캐릭터와 호 번호만. 매칭 결과는 절대 보여주지 않는다.
const pub = (p: Person) => ({ gender: p.gender, number: p.number, shape: p.shape, prop: p.prop, color: p.color, keywords: p.keywords });

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const event = await getEvent({ slug: (await params).slug });
  const k = new URL(req.url).searchParams.get('k') ?? '';
  if (!event) return NextResponse.json({ ok: false }, { status: 404 });
  const run = await loadRun(event.id);
  const a = Buffer.from(k), b = Buffer.from(run.ev.screen_key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ ok: false }, { status: 404 });
  const tp = tablePairs(run);
  return NextResponse.json({
    ok: true, serverNow: Date.now(),
    view: {
      phase: run.ev.phase, total: run.ev.table_count, round: run.current,
      pairs: tp.map((x) => ({ table: x.table, f: x.f.map(pub), m: x.m.map(pub) })),
      resting: tp.flatMap((x) => (x.f.length && !x.m.length ? x.f : x.m.length && !x.f.length ? x.m : [])).map(pub),
      lounge: run.people.filter((p) => !p.excluded).map(pub),
    },
  }, { headers: { 'cache-control': 'no-store' } });
}
