'use client';
import { matchSms, noMatchSms } from '../../../../lib/domain/sms';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../../../../components/Icon';
import { FloorPlan } from '../../../../components/FloorPlan';
import { RoundTimer } from '../../../../components/RoundTimer';
import { api } from '../../../../lib/api';
import { ho } from '../../../../lib/domain/lounge';
import { notStarted, type Round } from '../../../../lib/domain/seating';
import type { HostCmd, Moved, Person, Phase, ResetWhat } from '../../../../lib/server/run';

type View = {
  ev: { slug: string; phase: Phase; table_count: number; per_table: number; locked: boolean; round_duration_sec: number; max_picks: number };
  current: Round | null; people: Person[];
  pairs: { table: number; f: Person[]; m: Person[] }[];
  extras: { picks: { id: string; to: string[] }[]; matches: [string, string][]; brave?: [string, string][]; contacts: Record<string, { email: string; phone: string }>; wine: { gender: 'f' | 'm'; number: number | null; name: string; age: number; job: string; phone: string; email: string }[]; done: number; total: number; notes: { id: string; round: number; fromId: string; toId: string; body: string; hidden: boolean }[] };
};
const PHASE_KO: [Phase, string][] = [['before', '시작 전'], ['talk', '대화'], ['choice', '최종 선택'], ['closing', '마무리']];

export default function Run({ slug, when }: { slug: string; when: string }) {
  const [v, setV] = useState<View | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [custom, setCustom] = useState('');
  const [moved, setMoved] = useState<Moved[] | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const t0 = Date.now(), my = ++seq.current;
    const j = await api<{ view: View; serverNow: number }>(`/api/host/${slug}/run`);
    if (j.http === 401) { location.href = '/host'; return; } // 12시간 쿠키가 끝났다 → 다시 로그인
    if (my !== seq.current) return; // 명령 뒤의 새 응답을 옛 폴링 응답이 덮어쓰지 않게
    if (j.ok && j.view) { setV(j.view); setOffset(j.serverNow! - (t0 + Date.now()) / 2); }
  }, [slug]);
  // shortcut: 2초마다 새로 읽는다 (실시간 신호는 다음 단계). 타이머 자체는 서버 시각으로 매 0.25초 계산.
  useEffect(() => { load(); const t = setInterval(() => document.visibilityState === 'visible' && load(), 2000); return () => clearInterval(t); }, [load]);

  const show = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2600); };
  const send = async (cmd: HostCmd) => {
    setBusy(true);
    const j = await api<{ moved: Moved[] }>(`/api/host/${slug}/run`, cmd);
    setBusy(false);
    if (!j.ok) show(j.message ?? '다시 시도해주세요.');
    await load();
    return j;
  };
  const reset = async (what: ResetWhat, msg: string) => { if (window.confirm(`${msg}
되돌릴 수 없어요. 초기화할까요?`)) { const j = await send({ type: 'reset', what }); if (j.ok) show('초기화했어요'); } };
  const ResetBtn = ({ what, msg }: { what: ResetWhat; msg: string }) => <button className="lnk run-reset" disabled={busy} onClick={() => reset(what, msg)}>초기화</button>;
  const compact = async () => { const j = await send({ type: 'compact' }); if (j.ok) setMoved(j.moved ?? []); };
  const hoOf = (g: 'f' | 'm', n: number | null) => (n == null ? '번호 없음' : ho(g, n));
  const movedText = (moved ?? []).filter((m) => m.to != null).map((m) => `[플러팅 라운지] ${m.name}님, 오늘 번호가 ${hoOf(m.gender, m.to)}로 바뀌었어요. 첫 대화는 ${m.to}번 테이블이에요.`).join('\n\n');

  // 진행 알림: 이번 라운드 롤링페이퍼가 다 모였는지, 최종 선택을 다 냈는지. 완료로 바뀌는 순간 토스트와 진동.
  const cur = v?.current ?? null;
  const notesNeed = v && cur ? v.pairs.reduce((s, p) => s + p.f.length * p.m.length * 2, 0) : 0;
  const notesGot = v && cur ? v.extras.notes.filter((n) => n.round === cur.no).length : 0;
  const notesShow = !!cur && notesNeed > 0 && (!!cur.closedAt || notesGot > 0);
  const notesAll = notesShow && notesGot >= notesNeed;
  const choiceShow = v?.ev.phase === 'choice' && v.extras.total > 0;
  const choiceAll = choiceShow && v!.extras.done >= v!.extras.total;
  const was = useRef({ notes: '', choice: false });
  useEffect(() => {
    const key = notesAll ? `${cur?.no}` : '';
    if (key && was.current.notes !== key) { show(`${cur?.no}라운드 롤링페이퍼가 모두 전달됐어요`); navigator.vibrate?.(200); }
    if (choiceAll && !was.current.choice) { show('모두 최종 선택을 제출했어요'); navigator.vibrate?.(200); }
    was.current = { notes: key || was.current.notes, choice: choiceAll };
  }, [notesAll, choiceAll, cur?.no]);

  if (!v) return <main className="bd"><p className="ds">불러오는 중…</p></main>;
  const { ev, current } = v;
  const byId = new Map(v.people.map((p) => [p.id, p]));
  const isBrave = (a: string, b: string) => !!v?.extras.brave?.some((m) => m.includes(a) && m.includes(b)); // 서로 용기 카드
  const copy = async (t: string, ok: string) => { try { await navigator.clipboard.writeText(t); show(ok); } catch { show('복사하지 못했어요'); } };
  const label = (p: Person) => ho(p.gender, p.number);
  const open = current && !current.closedAt;
  const waitStart = !!open && notStarted(current!); // 자리 이동 중: 타이머가 멈춰 있다
  const seated = v.people.filter((p) => p.number != null && !p.excluded);
  const nf = seated.filter((p) => p.gender === 'f').length, nm = seated.filter((p) => p.gender === 'm').length;

  return (
    <main>
      <div className="nb"><Link className="bk" aria-label="신청 관리" href={`/host/${slug}`}><Icon name="back" /></Link><div className="tt">진행</div></div>
      <div className="bd" style={{ paddingTop: 4, animation: 'none', paddingBottom: 60 }}>
        <p className="ds" style={{ margin: 0, fontSize: 13 }}>{when} · 한 테이블 {ev.per_table}:{ev.per_table} · 착석 여 {nf} · 남 {nm}</p>

        <div className="phases" role="tablist" aria-label="단계">
          {PHASE_KO.map(([p, label]) => (
            <button key={p} role="tab" aria-selected={ev.phase === p} className={ev.phase === p ? 'on' : ''} disabled={busy}
              onClick={() => ev.phase !== p && send({ type: 'setPhase', phase: p })}>{label}</button>
          ))}
        </div>

        {notesShow && <p className={`run-alert${notesAll ? ' ok' : ''}`} role="status">{notesAll ? `✓ ${cur!.no}라운드 롤링페이퍼 모두 전달됐어요` : `${cur!.no}라운드 롤링페이퍼 ${notesGot}/${notesNeed}장 도착`}</p>}
        {choiceShow && <p className={`run-alert${choiceAll ? ' ok' : ''}`} role="status">{choiceAll ? '✓ 모두 최종 선택을 제출했어요' : `최종 선택 ${v.extras.done}/${v.extras.total}명 제출`}</p>}

        <section className="run-card">
          <div className="run-h"><b>{current ? `${current.no}라운드` : '라운드 전'}<em> / {ev.table_count}</em></b>
            <span style={{ display: 'flex', gap: 12 }}>
              {open && <button className="lnk" style={{ margin: 0 }} disabled={busy} onClick={() => send({ type: 'endRound' })}>이번 라운드 끝내기</button>}
              {current && <ResetBtn what="rounds" msg="라운드·같이해보기·롤링페이퍼를 모두 지우고 '시작 전'으로 돌아가요." />}
            </span></div>
          {current && <RoundTimer round={current} offsetMs={offset} />}
          <div className="btn2" style={{ marginTop: 14, gridTemplateColumns: open && !waitStart ? '1fr 1.6fr' : '1fr' }}>
            {open && !waitStart && <button className="btn sub" disabled={busy} onClick={() => send({ type: current!.pausedAt ? 'resume' : 'pause' })}>{current!.pausedAt ? '다시 시작' : '일시정지'}</button>}
            {waitStart
              ? <button className="btn" disabled={busy} onClick={() => send({ type: 'resume' })}>자리 이동 끝 · 대화 시작</button>
              : <button className="btn" disabled={busy || (current?.no ?? 0) >= ev.table_count} onClick={() => send({ type: 'nextRound' })}>
              {!current ? '1라운드 자리 배정' : current.no >= ev.table_count ? '마지막 라운드예요' : '다음 라운드 → 남자 이동'}</button>}
          </div>
        </section>

        <p className="eb" style={{ marginTop: 26 }}>{current ? `${current.no}라운드 테이블` : '1라운드 테이블 (같은 번호끼리)'}</p>
        {!current && <button className="btn sub" style={{ height: 46, fontSize: 15, marginBottom: 10 }} disabled={busy} onClick={compact}>번호 당기기 · 빈 번호 없애기</button>}
        <FloorPlan pairs={v.pairs} faces={false} />

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
                <select aria-label={`${p.name} 번호`} value={p.number ?? ''} disabled={busy}
                  onChange={(e) => send({ type: 'setNumber', participantId: p.id, number: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">번호 없음</option>
                  {Array.from({ length: ev.table_count * ev.per_table }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{g === 'f' ? '여' : '남'}{n}호</option>)}
                </select>
                <div><b>{p.name}</b></div>
                <button className="lnk" style={{ margin: 0 }} onClick={() => send({ type: 'exclude', participantId: p.id, excluded: !p.excluded })}>{p.excluded ? '다시 넣기' : '안 옴 · 빼기'}</button>
              </div>
            ))}
            {v.people.filter((p) => p.gender === g).length === 0 && <p className="empty" style={{ padding: '12px 0' }}>{g === 'f' ? '여성' : '남성'} 사전 등록자가 아직 없어요</p>}
          </div>
        ))}

        <p className="eb" style={{ marginTop: 26 }}>모임 닫기</p>
        <div className="addf" style={{ paddingTop: 12 }}>
          <div className="kv" style={{ borderTop: 0 }}><span>참가자 입장 {ev.locked ? '(닫힘)' : '(열림)'}</span>
            <div className="chips" style={{ margin: 0 }}>
              {[[false, '열기'], [true, '닫기']].map(([o, l]) => <button key={String(o)} aria-pressed={ev.locked === o} style={ev.locked === o ? { background: 'var(--accbg)', color: 'var(--acc)' } : undefined} onClick={() => ev.locked !== o && send({ type: 'lock', locked: o as boolean })}>{l as string}</button>)}
            </div></div>
          <p className="ds" style={{ margin: '8px 0 0', fontSize: 12 }}>모임이 끝나면 닫아주세요. 입장 링크·전화번호로 아무도 못 들어오고, 데이터는 그대로 남아요.</p>
        </div>

        {(ev.phase === 'choice' || ev.phase === 'closing') && <>
          <p className="eb run-eb" style={{ marginTop: 26 }}>최종 선택 · {v.extras.done}/{v.extras.total}명 완료<ResetBtn what="choices" msg="모든 참가자의 최종 선택을 지워요." /></p>
          <div className="people">
            {v.extras.picks.map((x) => { const p = byId.get(x.id)!; return (
              <div key={x.id} className="person-row" style={{ alignItems: 'flex-start' }}>
                <b style={{ minWidth: 52, fontSize: 14 }}>{label(p)}</b>
                <div><b>{p.name}</b><span>{x.to.length ? x.to.map((t) => label(byId.get(t)!)).join(', ') : '아직 / 아무도 안 골랐어요'}</span></div>
              </div>); })}
          </div>
          <p className="eb" style={{ marginTop: 22 }}>매칭 커플 ({v.extras.matches.length}) · 연락처 전달용</p>
          <div className="people">
            {v.extras.matches.length === 0 && <p className="empty" style={{ padding: '12px 0' }}>아직 서로 고른 커플이 없어요</p>}
            {v.extras.matches.map(([a, b]) => { const pa = byId.get(a)!, pb = byId.get(b)!, fire = isBrave(a, b); return (
              <div key={a + b} className="person-row"><div><b>{label(pa)} {fire ? '🔥' : '♥'} {label(pb)}{fire && <em className="brave-tag">서로 용기 카드 · 카페 안내</em>}</b><span>{pa.name} · {v.extras.contacts[a]?.phone}</span><span>{pb.name} · {v.extras.contacts[b]?.phone}</span></div></div>); })}
          </div>
          <p className="eb" style={{ marginTop: 22 }}>결과 문자 · 업무용 폰으로 보내기</p>
          <div className="people">
            {v.extras.picks.map((x) => {
              const p = byId.get(x.id)!, phone = v.extras.contacts[x.id]?.phone ?? '';
              const mine = v.extras.matches.filter((m) => m.includes(x.id)).map((m) => byId.get(m[0] === x.id ? m[1] : m[0])!);
              const who = (o: typeof p) => ({ label: label(o), name: o.name, phone: v.extras.contacts[o.id]?.phone ?? '' });
              const fire = mine.find((o) => isBrave(x.id, o.id));
              const text = mine.length ? matchSms(p.name, mine.map(who), fire && who(fire)) : noMatchSms(p.name);
              return (
                <div key={x.id} className="person-row">
                  <div><b>{label(p)} {p.name} {mine.length ? '♥ 매칭' : ''}{fire ? ' 🔥' : ''}</b><span>{phone}</span></div>
                  <button className="lnk" style={{ margin: 0 }} onClick={() => copy(phone, '번호를 복사했어요')}>번호</button>
                  <button className="lnk" style={{ margin: 0, fontWeight: 800, color: 'var(--text)' }} onClick={() => copy(text, '문자를 복사했어요. 문자 앱에 붙여넣어 주세요')}>문자 복사</button>
                </div>); })}
          </div>
        </>}

        {v.extras.wine.length > 0 && <>
          <p className="eb run-eb" style={{ marginTop: 26 }}>연말 와인모임 문자 안내 신청 ({v.extras.wine.length})<ResetBtn what="closing" msg="와인모임 신청과 후기를 모두 지워요." /></p>
          <div className="people">
            {v.extras.wine.map((w) => (
              <div key={w.email + w.phone} className="person-row"><div><b>{w.gender === 'f' ? '여' : '남'}{w.number}호 {w.name} · {w.age}세 · {w.job}</b><span>{w.phone}</span></div></div>))}
          </div>
        </>}

        {v.extras.notes.length > 0 && <>
          <p className="eb run-eb" style={{ marginTop: 26 }}>롤링페이퍼 검토 · {v.extras.notes.length}장<ResetBtn what="notes" msg="모든 롤링페이퍼를 지워요. 끝난 라운드의 쪽지를 참가자가 다시 써야 해요." /></p>
          <div className="people">
            {v.extras.notes.map((n) => (
              <div key={n.id} className={`person-row${n.hidden ? ' off' : ''}`} style={{ alignItems: 'flex-start' }}>
                <div><b style={{ fontSize: 12, color: 'var(--mute)' }}>R{n.round} · {label(byId.get(n.fromId)!)} → {label(byId.get(n.toId)!)}</b><span style={{ display: 'block', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{n.body}</span></div>
                <button className="lnk" style={{ margin: 0 }} onClick={() => send({ type: 'hideNote', noteId: n.id, hidden: !n.hidden })}>{n.hidden ? '다시 보이기' : '숨기기'}</button>
              </div>))}
          </div>
        </>}

        <button className="btn sub" style={{ marginTop: 36, height: 46, fontSize: 15 }} disabled={busy}
          onClick={() => reset('all', '라운드·같이해보기·롤링페이퍼·최종 선택·후기·와인 신청을 모두 지우고 공개 설정을 꺼요. 참가자 등록과 호 번호는 그대로예요.')}>전체 초기화 · 리허설 전으로</button>
      </div>
      {moved && <>
        <div className="dim" onClick={() => setMoved(null)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="mv">
          <div className="grab" />
          <h3 id="mv">{moved.length ? `${moved.filter((m) => m.to != null).length}명의 번호가 바뀌었어요` : '이미 빈 번호가 없어요'}</h3>
          <p className="ds">테이블은 {ev.table_count}개로 맞췄어요.{moved.some((m) => m.to != null) && ' 바뀐 분께 아래 문구를 보내주세요.'}</p>
          {moved.length > 0 && <div className="given" style={{ marginTop: 14 }}>
            {moved.map((m) => <div className="kv" key={m.name + m.from}><span>{m.name}</span><b>{hoOf(m.gender, m.from)} → {hoOf(m.gender, m.to)}</b></div>)}
          </div>}
          <div className="btn2" style={{ marginTop: 18, gridTemplateColumns: movedText ? '1fr 1.6fr' : '1fr' }}>
            <button className="btn sub" onClick={() => setMoved(null)}>닫기</button>
            {movedText && <button className="btn" onClick={async () => { try { await navigator.clipboard.writeText(movedText); show('복사했어요. 카톡이나 문자로 보내주세요'); } catch { show('복사하지 못했어요'); } }}>안내 문구 복사</button>}
          </div>
        </div>
      </>}
      {toast && <div className="toast" role="status" style={{ bottom: 30 }}><Icon name="info" />{toast}</div>}
    </main>
  );
}
