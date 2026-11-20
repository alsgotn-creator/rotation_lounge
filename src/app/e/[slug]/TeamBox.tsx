'use client';
import { createClient, type RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Character } from '../../../components/Character';
import { Icon } from '../../../components/Icon';
import { api } from '../../../lib/api';
import { ho } from '../../../lib/domain/lounge';
import type { Shape } from '../../../lib/domain/register';
import type { TeamScreen, TeamView } from '../../api/e/[slug]/team/route';

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
  const [scr, setScr] = useState<TeamScreen | null>(null); // 시작 전 화면 (채팅방 열리기 전 · 채팅방 · 라운지)
  const load = useCallback(async () => {
    const j = await api<{ team: TeamView } & TeamScreen>(`/api/e/${slug}/team`);
    if (j.ok) { setT(j.team ?? null); if (j.screen) setScr({ screen: j.screen, chatFrom: j.chatFrom ?? 0 }); }
  }, [slug]);
  useEffect(() => {
    if (!enabled) return; // 더블 라운지가 아니면 팀이 없다
    load();
    const i = setInterval(() => document.visibilityState === 'visible' && load(), 3000);
    return () => clearInterval(i);
  }, [load, enabled]);
  return { team: t, reload: load, screen: scr?.screen, chatFrom: scr?.chatFrom };
}

/** 라운지 안의 작은 카드: 파트너가 정해지면 '채팅방 열기' */
const md = (ms: number) => { const k = new Date(ms + 9 * 3600e3); return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`; };

export function TeamCard({ team, onOpen, chatFrom }: { team: TeamView | undefined; onOpen: () => void; chatFrom?: number }) {
  if (team === undefined) return null;
  if (team === null) return (
    <section className="tm">
      <h2 className="tm-t">{chatFrom ? `${md(chatFrom)}에 파트너가 공개돼요` : '파트너는 모임 이틀 전 공개돼요'}</h2>
      <p className="ds">모임 당일 서로의 소개를 도와주고 이상형을 추천해줄 파트너가 정해져요. 공개되면 둘만의 채팅방이 열려요.</p>
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

/** 둘만의 채팅방. 기본은 전체 화면(뒤로 가기 → 라운지), mini 는 라운지 안의 작은 창(× 로 닫기) */
export function TeamChat({ slug, team, reload, onBack, mini = false }: { slug: string; team: NonNullable<TeamView>; reload: () => Promise<void>; onBack: () => void; mini?: boolean }) {
  const [msg, setMsg] = useState('');
  const [name, setName] = useState(team.name); // 팀 이름: 적으면 잠시 뒤 저절로 저장된다
  const [nameSt, setNameSt] = useState<'' | 'saving' | 'saved'>('');
  const editing = useRef(false);
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

  useEffect(() => { const m = end.current?.parentElement; if (m) m.scrollTop = m.scrollHeight; }, [team.messages.length, typing]);
  // 파트너가 지은 이름도 바로 보이게 (내가 적는 중이 아닐 때만)
  useEffect(() => { if (!editing.current) setName(team.name); }, [team.name]);
  // 팀 이름은 적고 0.8초 멈추면 저절로 등록하고 파트너 화면에도 바로 알린다
  useEffect(() => {
    if (!editing.current) return;
    const v = name.trim();
    if (!v || v === team.name) { setNameSt(v ? 'saved' : ''); return; }
    setNameSt('saving');
    const id = setTimeout(async () => {
      const j = await api(`/api/e/${slug}/team`, { type: 'name', name: v });
      if (!j.ok) { setErr(j.message ?? '팀 이름을 저장하지 못했어요.'); setNameSt(''); return; }
      ch.current?.send({ type: 'broadcast', event: 'msg', payload: {} });
      editing.current = false; setNameSt('saved'); reload();
    }, 800);
    return () => clearTimeout(id);
  }, [name, team.name, slug, reload]);

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
    <main className={mini ? 'tc tc-mini' : 'tc'}>
      <header className="tc-top">
        {!mini && <button type="button" className="tc-back" aria-label="라운지로" onClick={onBack}><Icon name="back" /></button>}
        <button type="button" className="tc-who" onClick={() => setInfo(!info)} aria-expanded={info}>
          <Character shape={p.shape as Shape} color={p.color} acc={p.prop} size={mini ? 30 : 36} />
          <span><b>{ho(p.gender, p.number)}<small>파트너</small></b><small>{team.name ? `팀 ${team.name}` : '팀 이름을 지어주세요'} · 첫 테이블 {team.firstTable}번</small></span>
          <Icon name="down" />
        </button>
        {mini && <button type="button" className="tc-back" aria-label="채팅 닫기" onClick={onBack}><Icon name="x" /></button>}
      </header>

      {/* 팀 이름: 둘 중 누가 적어도 저절로 등록된다 */}
      <label className="tc-name">
        <span>팀 이름</span>
        <input maxLength={15} placeholder="얘기를 나눈 뒤 팀 이름을 지정해주세요." value={name} onChange={(e) => { editing.current = true; setName(e.target.value); setErr(''); }} />
        <em aria-live="polite">{nameSt === 'saving' ? '저장 중…' : nameSt === 'saved' ? '✓ 등록됨' : ''}</em>
      </label>

      {info && <div className="tc-info">
        <p className="tc-meta">{p.age}세 · {p.job} · {p.area} · {p.mbti}</p>
        <dl className="tm-dl">
          <div><dt>이상형</dt><dd>{p.ideal || '아직 안 적었어요'}</dd></div>
          <div><dt>매력</dt><dd>{p.charm || '아직 안 적었어요'}</dd></div>
        </dl>
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
