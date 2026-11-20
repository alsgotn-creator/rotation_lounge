'use client';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Character } from '../../../components/Character';
import { Icon } from '../../../components/Icon';
import { api } from '../../../lib/api';
import { ho } from '../../../lib/domain/lounge';
import type { Shape } from '../../../lib/domain/register';
import type { TeamView } from '../../api/e/[slug]/team/route';

// 브라우저용 Supabase: 데이터는 읽지 않고, 둘만의 채널로 '입력 중'·'새 메시지' 신호만 주고받는다
let rt: ReturnType<typeof createClient> | null = null;
const realtime = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  rt ??= createClient(url, key, { auth: { persistSession: false } });
  return rt;
};

/** 내 팀 상태. undefined = 아직 모름, null = 파트너가 아직 없음. 3초마다(채팅 중엔 신호가 오면 바로) 새로 읽는다 */
export function useTeam(slug: string, enabled = true) {
  const [t, setT] = useState<TeamView | undefined>(undefined);
  const load = useCallback(async () => {
    const j = await api<{ team: TeamView }>(`/api/e/${slug}/team`);
    if (j.ok) setT(j.team ?? null);
  }, [slug]);
  useEffect(() => {
    if (!enabled) return; // 더블 라운지가 아니면 팀이 없다
    load();
    const i = setInterval(() => document.visibilityState === 'visible' && load(), 3000);
    return () => clearInterval(i);
  }, [load, enabled]);
  return { team: t, reload: load };
}

/** 라운지 안의 작은 카드: 파트너가 정해지면 '채팅방 열기' */
export function TeamCard({ team, onOpen }: { team: TeamView | undefined; onOpen: () => void }) {
  if (team === undefined) return null;
  if (team === null) return (
    <section className="tm">
      <p className="tm-eb">MY PARTNER</p>
      <h2 className="tm-t">파트너는 모임 전날 공개돼요</h2>
      <p className="ds">오늘 내 편이 되어줄 이성 파트너가 한 명 정해져요. 공개되면 둘만의 채팅방이 열려요.</p>
    </section>
  );
  const p = team.partner;
  return (
    <button type="button" className="tm tm-open" onClick={onOpen}>
      <Character shape={p.shape as Shape} color={p.color} acc={p.prop} size={44} />
      <span className="tm-open-tx"><b>{team.name ? `팀 ${team.name}` : '우리 팀'} · {ho(p.gender, p.number)}</b><small>{team.messages.length ? team.messages[team.messages.length - 1].body : '파트너와 둘만의 채팅방'}</small></span>
      <em>채팅</em>
    </button>
  );
}

/** 둘만의 채팅방 (전체 화면). 뒤로 가기 → 라운지 */
export function TeamChat({ slug, team, reload, onBack }: { slug: string; team: NonNullable<TeamView>; reload: () => Promise<void>; onBack: () => void }) {
  const [msg, setMsg] = useState('');
  const [name, setName] = useState<string | null>(null); // 팀 이름 고치는 중일 때만 값이 있다
  const [info, setInfo] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [typing, setTyping] = useState(false); // 파트너가 적는 중
  const end = useRef<HTMLDivElement>(null);
  const ch = useRef<RealtimeChannel | null>(null);
  const sentAt = useRef(0);
  const off = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const p = team.partner;

  // 실시간 채널: 파트너가 입력하면 '...' (3초 동안 신호가 없으면 사라짐), 메시지를 보내면 바로 새로 읽기
  useEffect(() => {
    const sb = realtime();
    if (!sb) return;
    const c = sb.channel(team.channel, { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'typing' }, () => { setTyping(true); clearTimeout(off.current); off.current = setTimeout(() => setTyping(false), 3000); })
      .on('broadcast', { event: 'msg' }, () => { setTyping(false); reload(); })
      .subscribe();
    ch.current = c;
    return () => { clearTimeout(off.current); sb.removeChannel(c); ch.current = null; };
  }, [team.channel, reload]);

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [team.messages.length, typing]);

  const signalTyping = () => {
    const now = Date.now();
    if (now - sentAt.current < 1500) return; // 1.5초에 한 번만
    sentAt.current = now;
    ch.current?.send({ type: 'broadcast', event: 'typing', payload: {} });
  };
  const post = async (body: object) => {
    setBusy(true); setErr('');
    const j = await api(`/api/e/${slug}/team`, body);
    setBusy(false);
    if (!j.ok) { setErr(j.message ?? '다시 시도해주세요.'); return false; }
    ch.current?.send({ type: 'broadcast', event: 'msg', payload: {} });
    await reload(); return true;
  };

  return (
    <main className="tc">
      <header className="tc-top">
        <button type="button" className="tc-back" aria-label="라운지로" onClick={onBack}><Icon name="back" /></button>
        <button type="button" className="tc-who" onClick={() => setInfo(!info)} aria-expanded={info}>
          <Character shape={p.shape as Shape} color={p.color} acc={p.prop} size={36} />
          <span><b>{ho(p.gender, p.number)}<small>파트너</small></b><small>{team.name ? `팀 ${team.name}` : '팀 이름을 지어주세요'} · 첫 테이블 {team.firstTable}번</small></span>
          <Icon name="down" />
        </button>
      </header>

      {info && <div className="tc-info">
        <p className="tc-meta">{p.age}세 · {p.job} · {p.area} · {p.mbti}</p>
        <dl className="tm-dl">
          <div><dt>이상형</dt><dd>{p.ideal || '아직 안 적었어요'}</dd></div>
          <div><dt>매력</dt><dd>{p.charm || '아직 안 적었어요'}</dd></div>
        </dl>
        <div className="tm-name">
          {name === null
            ? <><span className="tc-meta">{team.name ? `팀 이름 · ${team.name}` : '아직 팀 이름이 없어요'}</span><button className="lnk" style={{ margin: 0 }} onClick={() => setName(team.name)}>{team.name ? '바꾸기' : '짓기'}</button></>
            : <form onSubmit={async (e) => { e.preventDefault(); if (await post({ type: 'name', name })) setName(null); }}>
                <input autoFocus maxLength={15} placeholder="둘만의 팀 이름" value={name} onChange={(e) => setName(e.target.value)} />
                <button className="btn" disabled={busy || !name.trim()}>저장</button>
              </form>}
        </div>
      </div>}

      <div className="tc-msgs" aria-live="polite">
        {team.messages.length === 0 && <p className="tc-empty">먼저 인사해보세요!<br />첫 미션은 둘만의 팀 이름 짓기예요.</p>}
        {team.messages.map((m) => <p key={m.id} className={m.me ? 'me' : ''}>{m.body}</p>)}
        {typing && <p className="tc-typing" aria-label="파트너가 입력 중"><i /><i /><i /></p>}
        <div ref={end} />
      </div>

      <form className="tc-in" onSubmit={async (e) => { e.preventDefault(); if (msg.trim() && (await post({ type: 'msg', body: msg }))) setMsg(''); }}>
        {err && <p role="alert" className="tc-err">{err}</p>}
        <input maxLength={300} placeholder="메시지 · 연락처는 못 보내요" value={msg} onChange={(e) => { setMsg(e.target.value); setErr(''); if (e.target.value) signalTyping(); }} />
        <button className="btn" disabled={busy || !msg.trim()}>보내기</button>
      </form>
    </main>
  );
}
