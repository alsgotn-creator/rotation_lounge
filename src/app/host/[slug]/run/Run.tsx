'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../../../../components/Icon';
import { FloorPlan } from '../../../../components/FloorPlan';
import { RoundTimer } from '../../../../components/RoundTimer';
import type { Round } from '../../../../lib/domain/seating';
import type { HostCmd, Person, Phase } from '../../../../lib/server/run';

type View = {
  ev: { slug: string; phase: Phase; table_count: number; round_duration_sec: number; max_picks: number; screen_key: string };
  current: Round | null; people: Person[];
  pairs: { table: number; f: Person | null; m: Person | null }[];
};
const PHASE_KO: [Phase, string][] = [['before', '시작 전'], ['talk', '대화'], ['choice', '최종 선택'], ['closing', '마무리']];

export default function Run({ slug, when }: { slug: string; when: string }) {
  const [v, setV] = useState<View | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [custom, setCustom] = useState('');

  const load = useCallback(async () => {
    const t0 = Date.now();
    const r = await fetch(`/api/host/${slug}/run`, { cache: 'no-store' }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (j?.ok) { setV(j.view); setOffset(j.serverNow - (t0 + Date.now()) / 2); }
  }, [slug]);
  // shortcut: 2초마다 새로 읽는다 (실시간 신호는 다음 단계). 타이머 자체는 서버 시각으로 매 0.25초 계산.
  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);

  const show = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const send = async (cmd: HostCmd) => {
    setBusy(true);
    const r = await fetch(`/api/host/${slug}/run`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
    const j = await r.json().catch(() => ({ ok: false, message: '다시 시도해주세요.' }));
    setBusy(false);
    if (!j.ok) show(j.message);
    await load();
  };

  if (!v) return <main className="bd"><p className="ds">불러오는 중…</p></main>;
  const { ev, current } = v;
  const open = current && !current.closedAt;
  const screenUrl = typeof window === 'undefined' ? '' : `${location.origin}/screen/${slug}?k=${encodeURIComponent(ev.screen_key)}`;
  const seated = v.people.filter((p) => p.number != null && !p.excluded);
  const nf = seated.filter((p) => p.gender === 'f').length, nm = seated.filter((p) => p.gender === 'm').length;

  return (
    <main>
      <div className="nb"><Link className="bk" aria-label="신청 관리" href={`/host/${slug}`}><Icon name="back" /></Link><div className="tt">진행</div></div>
      <div className="bd" style={{ paddingTop: 4, animation: 'none', paddingBottom: 60 }}>
        <p className="ds" style={{ margin: 0, fontSize: 13 }}>{when} · 착석 여 {nf} · 남 {nm}</p>

        <div className="phases" role="tablist" aria-label="단계">
          {PHASE_KO.map(([p, label]) => (
            <button key={p} role="tab" aria-selected={ev.phase === p} className={ev.phase === p ? 'on' : ''} disabled={busy}
              onClick={() => ev.phase !== p && send({ type: 'setPhase', phase: p })}>{label}</button>
          ))}
        </div>

        <section className="run-card">
          <div className="run-h"><b>{current ? `${current.no}라운드` : '라운드 전'}<em> / {ev.table_count}</em></b>
            {open && <button className="lnk" style={{ margin: 0 }} disabled={busy} onClick={() => send({ type: 'endRound' })}>이번 라운드 끝내기</button>}</div>
          {current && <RoundTimer round={current} offsetMs={offset} />}
          <div className="btn2" style={{ marginTop: 14, gridTemplateColumns: open ? '1fr 1.6fr' : '1fr' }}>
            {open && <button className="btn sub" disabled={busy} onClick={() => send({ type: current!.pausedAt ? 'resume' : 'pause' })}>{current!.pausedAt ? '다시 시작' : '일시정지'}</button>}
            <button className="btn" disabled={busy || (current?.no ?? 0) >= ev.table_count} onClick={() => send({ type: 'nextRound' })}>
              {!current ? '1라운드 시작' : current.no >= ev.table_count ? '마지막 라운드예요' : '다음 라운드 → 남자 이동'}</button>
          </div>
        </section>

        <p className="eb" style={{ marginTop: 26 }}>{current ? `${current.no}라운드 테이블` : '1라운드 테이블 (같은 번호끼리)'}</p>
        <FloorPlan pairs={v.pairs.map((x) => ({ table: x.table, f: x.f && { ...x.f, nickname: x.f.nickname }, m: x.m && { ...x.m, nickname: x.m.nickname } }))} faces={false} />

        <p className="eb" style={{ marginTop: 26 }}>설정</p>
        <div className="addf" style={{ paddingTop: 12 }}>
          <div className="kv" style={{ borderTop: 0 }}><span>라운드 시간</span>
            <div className="chips" style={{ margin: 0 }}>
              {[12, 15].map((m) => <button key={m} style={ev.round_duration_sec === m * 60 ? { background: 'var(--accbg)', color: 'var(--acc)' } : undefined} onClick={() => send({ type: 'settings', roundDurationSec: m * 60 })}>{m}분</button>)}
              <input aria-label="직접 입력(분)" inputMode="numeric" placeholder={![720, 900].includes(ev.round_duration_sec) ? String(ev.round_duration_sec / 60) : '직접'} value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, ''))}
                onBlur={() => { if (custom) send({ type: 'settings', roundDurationSec: Number(custom) * 60 }); setCustom(''); }} className="mini-in" />
            </div></div>
          <div className="kv"><span>최종 선택 인원</span>
            <div className="chips" style={{ margin: 0 }}>{[2, 3].map((n) => <button key={n} style={ev.max_picks === n ? { background: 'var(--accbg)', color: 'var(--acc)' } : undefined} onClick={() => send({ type: 'settings', maxPicks: n })}>{n}명</button>)}</div></div>
          <div className="kv"><span>테이블 수</span>
            <div className="chips" style={{ margin: 0 }}>
              <button disabled={!!current || ev.table_count <= 2} onClick={() => send({ type: 'settings', tableCount: ev.table_count - 1 })} aria-label="테이블 하나 빼기">−</button>
              <b style={{ minWidth: 28, textAlign: 'center', alignSelf: 'center' }}>{ev.table_count}</b>
              <button disabled={!!current || ev.table_count >= 12} onClick={() => send({ type: 'settings', tableCount: ev.table_count + 1 })} aria-label="테이블 하나 더하기">+</button>
            </div></div>
        </div>

        <p className="eb" style={{ marginTop: 26 }}>참가자 · 호 번호 고치기</p>
        {(['f', 'm'] as const).map((g) => (
          <div key={g} className="people">
            {v.people.filter((p) => p.gender === g).map((p) => (
              <div key={p.id} className={`person-row${p.excluded ? ' off' : ''}`}>
                <select aria-label={`${p.nickname} 번호`} value={p.number ?? ''} disabled={busy}
                  onChange={(e) => send({ type: 'setNumber', participantId: p.id, number: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">번호 없음</option>
                  {Array.from({ length: ev.table_count }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{g === 'f' ? '여' : '남'}{n}호</option>)}
                </select>
                <div><b>{p.nickname}</b><span>{p.name}</span></div>
                <button className="lnk" style={{ margin: 0 }} onClick={() => send({ type: 'exclude', participantId: p.id, excluded: !p.excluded })}>{p.excluded ? '다시 넣기' : '안 옴 · 빼기'}</button>
              </div>
            ))}
            {v.people.filter((p) => p.gender === g).length === 0 && <p className="empty" style={{ padding: '12px 0' }}>{g === 'f' ? '여성' : '남성'} 사전 등록자가 아직 없어요</p>}
          </div>
        ))}

        <p className="eb" style={{ marginTop: 26 }}>큰 화면</p>
        <div className="btn2">
          <button className="btn sub" onClick={async () => { try { await navigator.clipboard.writeText(screenUrl); show('큰 화면 링크를 복사했어요'); } catch { show(screenUrl); } }}>링크 복사</button>
          <a className="btn" href={screenUrl} target="_blank" rel="noreferrer">큰 화면 열기</a>
        </div>
      </div>
      {toast && <div className="toast" role="status" style={{ bottom: 30 }}><Icon name="info" />{toast}</div>}
    </main>
  );
}
