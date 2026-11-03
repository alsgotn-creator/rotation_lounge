import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '../../components/Icon';
import { isHost } from '../../lib/server/auth';
import { db, hasDb } from '../../lib/server/supabase';
import { EVENT_COLS } from '../../lib/server/signup';
import { HOST_NAME } from '../../lib/signup/data';
import { toSession, type AppStatus, type EventRow, type Gender } from '../../lib/signup/rules';
import NewEvent from './NewEvent';

export const metadata: Metadata = { title: '호스트 · 플러팅 라운지', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function HostHome({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  if (!hasDb() || !process.env.HOST_PASSWORD) {
    return <main className="bd"><h2 className="q">설정이 필요해요</h2><p className="ds">.env.local(배포 시 Vercel 환경 변수)에 Supabase 키와 HOST_PASSWORD를 넣어주세요.</p></main>;
  }
  if (!(await isHost())) {
    return (
      <main>
        <div className="ah"><span className="logo">플러팅<i>.</i>라운지</span><span className="host">호스트</span></div>
        <form className="bd" method="post" action="/api/host/login">
          <h2 className="q">{HOST_NAME}님,<br />비밀번호를 입력해주세요</h2>
          <label className={`fld${e ? ' err' : ''}`}><span>비밀번호</span>
            <input autoFocus type="password" name="password" autoComplete="current-password" />
            {e && <p className="msg e">비밀번호가 맞지 않아요</p>}</label>
          <div className="ft"><button className="btn">들어가기</button></div>
        </form>
      </main>
    );
  }

  const { data } = await db().from('events').select(EVENT_COLS).order('starts_at', { ascending: false }).limit(30);
  const events = (data ?? []) as EventRow[];
  const { data: apps } = events.length
    ? await db().from('applications').select('event_id,gender,status').in('event_id', events.map((x) => x.id))
    : { data: [] };
  const rows = (apps ?? []) as { event_id: string; gender: Gender; status: AppStatus }[];

  return (
    <main>
      <div className="ah"><span className="logo">플러팅<i>.</i>라운지</span>
        <form method="post" action="/api/host/login"><input type="hidden" name="logout" value="1" /><button className="host" style={{ border: 0, cursor: 'pointer' }}>{HOST_NAME} · 로그아웃</button></form></div>
      <div className="bd" style={{ animation: 'none' }}>
        <h2 className="q">일정</h2>
        {events.length === 0 && <p className="ds">아직 일정이 없어요. 아래에서 첫 일정을 만들어주세요.</p>}
        {events.map((ev) => {
          const mine = rows.filter((r) => r.event_id === ev.id);
          const s = toSession(ev, mine);
          const fresh = mine.filter((r) => r.status === 'new').length;
          return (
            <Link key={ev.id} href={`/host/${ev.slug}`} className="opt">
              <div className="d">{s.mon}<b>{s.day}</b>{s.dow}</div>
              <div className="t"><strong>{s.time} · {ev.venue}</strong>
                여 {ev.capacity_per_gender - s.seatsF}/{ev.capacity_per_gender} · 남 {ev.capacity_per_gender - s.seatsM}/{ev.capacity_per_gender}
                {fresh > 0 && <><br /><em>새 신청 {fresh}</em></>}{!ev.apply_open && <><br />신청 닫힘</>}</div>
              <Icon name="next" />
            </Link>
          );
        })}
        <NewEvent />
      </div>
    </main>
  );
}
