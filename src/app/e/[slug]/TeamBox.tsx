'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Character } from '../../../components/Character';
import { api } from '../../../lib/api';
import { ho } from '../../../lib/domain/lounge';
import type { Shape } from '../../../lib/domain/register';
import type { TeamView } from '../../api/e/[slug]/team/route';

/** 더블 라운지 대기실의 '우리 팀': 파트너 정보 · 이상형과 매력 포인트 · 팀 이름 · 둘만의 채팅. */
export default function TeamBox({ slug }: { slug: string }) {
  const [t, setT] = useState<TeamView | undefined>(undefined);
  const [msg, setMsg] = useState('');
  const [name, setName] = useState<string | null>(null); // 고치는 중일 때만 값이 있다
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(0);
  const box = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const prev = useRef<TeamView | undefined>(undefined);

  const load = useCallback(async () => {
    const j = await api<{ team: TeamView }>(`/api/e/${slug}/team`);
    if (j.ok) setT(j.team ?? null);
  }, [slug]);
  // shortcut: 채팅은 3초마다 새로 읽는다. 둘만 쓰는 방이라 충분하다
  useEffect(() => {
    load();
    const i = setInterval(() => document.visibilityState === 'visible' && load(), 3000);
    return () => clearInterval(i);
  }, [load]);
  useEffect(() => {
    const n = t?.messages.length ?? 0;
    if (n > count.current && count.current > 0) end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    count.current = n;
  }, [t?.messages.length]);
  // 채팅 칸이 화면에 보이는지 (보이면 위쪽 '채팅하기' 버튼을 숨긴다)
  useEffect(() => {
    if (!box.current) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(box.current);
    return () => io.disconnect();
  }, [t === null, t === undefined]);
  // 보고 있는 동안 파트너가 정해지면(호스트가 매칭을 누르면) 채팅 칸으로 바로 옮겨준다
  useEffect(() => {
    if (prev.current === null && t) setTimeout(() => go(), 50);
    prev.current = t;
  }, [t]);
  const go = () => { box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setTimeout(() => box.current?.querySelector<HTMLInputElement>('.tm-in input')?.focus({ preventScroll: true }), 500); };

  const post = async (body: object) => {
    setBusy(true); setErr('');
    const j = await api(`/api/e/${slug}/team`, body);
    setBusy(false);
    if (!j.ok) { setErr(j.message ?? '다시 시도해주세요.'); return false; }
    await load(); return true;
  };

  if (t === undefined) return null;
  if (t === null) return (
    <section className="tm" ref={box}>
      <p className="tm-eb">MY PARTNER</p>
      <h2 className="tm-t">파트너는 모임 전날 공개돼요</h2>
      <p className="ds">오늘 내 편이 되어줄 이성 파트너가 한 명 정해져요. 공개되면 여기서 둘만의 채팅을 할 수 있어요.</p>
    </section>
  );
  const p = t.partner;
  return (
    <section className="tm" id="team" ref={box}>
      {!inView && <button type="button" className="tm-jump" onClick={go}>파트너가 정해졌어요 · 채팅하기{t.messages.length > 0 && <b>{t.messages.length}</b>}</button>}
      <div className="tm-name">
        {name === null
          ? <><h2 className="tm-t">{t.name ? `팀 ${t.name}` : '팀 이름을 지어주세요'}</h2><button className="lnk" style={{ margin: 0 }} onClick={() => setName(t.name)}>{t.name ? '바꾸기' : '짓기'}</button></>
          : <form onSubmit={async (e) => { e.preventDefault(); if (await post({ type: 'name', name })) setName(null); }}>
              <input autoFocus maxLength={15} placeholder="둘만의 팀 이름" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="btn" disabled={busy || !name.trim()}>저장</button>
            </form>}
      </div>
      <p className="tm-sub">당일 첫 테이블 <b>{t.firstTable}번</b>에 함께 앉아요</p>
      <div className="tm-card">
        <div className="tm-who">
          <Character shape={p.shape as Shape} color={p.color} acc={p.prop} size={48} />
          <div>
            <b>{ho(p.gender, p.number)}<small>파트너</small></b>
            <span>{p.age}세 · {p.job} · {p.area} · {p.mbti}</span>
          </div>
        </div>
        <dl className="tm-dl">
          <div><dt>이상형</dt><dd>{p.ideal || '아직 안 적었어요'}</dd></div>
          <div><dt>매력</dt><dd>{p.charm || '아직 안 적었어요'}</dd></div>
        </dl>
      </div>

      <div className="tm-chat" aria-live="polite">
        {t.messages.length === 0 && <p className="empty" style={{ padding: '14px 0' }}>먼저 인사해보세요! 첫 미션은 팀 이름 짓기예요.</p>}
        {t.messages.map((m) => <p key={m.id} className={m.me ? 'me' : ''}>{m.body}</p>)}
        <div ref={end} />
      </div>
      <form className="tm-in" onSubmit={async (e) => { e.preventDefault(); if (msg.trim() && (await post({ type: 'msg', body: msg }))) setMsg(''); }}>
        <input maxLength={300} placeholder="메시지 · 연락처는 못 보내요" value={msg} onChange={(e) => { setMsg(e.target.value); setErr(''); }} />
        <button className="btn" disabled={busy || !msg.trim()}>보내기</button>
      </form>
      {err && <p role="alert" style={{ color: 'var(--err)', fontSize: 13, margin: '8px 0 0' }}>{err}</p>}
    </section>
  );
}
