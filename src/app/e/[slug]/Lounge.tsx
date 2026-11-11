'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Character } from '../../../components/Character';
import { Icon } from '../../../components/Icon';
import { IdealCloud } from '../../../components/IdealCloud';
import { api } from '../../../lib/api';
import { IDEAL } from '../../../lib/domain/ideal';
import { ho } from '../../../lib/domain/lounge';
import { PALETTE, phrases } from '../../../lib/domain/loveType';
import type { Shape } from '../../../lib/domain/register';
import type { LoungeView } from '../../../lib/server/lounge';

/** 누를 때마다 통통 / 흔들 / 찌그러짐을 돌아가며, 하트가 떠오른다. */
function Poke({ children }: { children: React.ReactNode }) {
  const [n, setN] = useState(0);
  return (
    <button type="button" className="poke" aria-label="캐릭터 톡 건드리기" onClick={() => setN((x) => x + 1)}>
      <span key={n} className={`poke-in${n ? ` a${(n - 1) % 3}` : ''}`}>{children}</span>
      {n > 0 && <i key={`h${n}`} className="poke-heart" aria-hidden="true">♥</i>}
    </button>
  );
}

/** 손가락으로 끌어서 옮기기. 조금만 움직였으면 그냥 톡 건드린 것으로 둔다. 위치는 이 폰에서만 바뀐다. */
function Drag({ className, style, children }: { className?: string; style?: React.CSSProperties; children: React.ReactNode }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);
  const start = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  return (
    <div className={`drag${on ? ' on' : ''}${className ? ` ${className}` : ''}`} style={{ ...style, translate: `${pos.x}px ${pos.y}px` }}
      onPointerDown={(e) => { start.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); setOn(true); }}
      onPointerMove={(e) => {
        const s = start.current; if (!s) return;
        const dx = e.clientX - s.px, dy = e.clientY - s.py;
        if (!s.moved && Math.hypot(dx, dy) < 6) return;
        s.moved = true; setPos({ x: s.x + dx, y: s.y + dy });
      }}
      onPointerUp={() => setOn(false)} onPointerCancel={() => setOn(false)}
      onClickCapture={(e) => { if (start.current?.moved) { e.stopPropagation(); e.preventDefault(); } start.current = null; }}>
      {children}
    </div>
  );
}

const PREP: [string, string?][] = [
  ['겉옷과 가방은 중앙 테이블에 놓거나 호스트에게 맡겨요.', '남성분들은 자리를 이동해야 해서 맡기는 게 편해요!'],
  ['마주한 분과 대화 나누고 계시면, 잠시 대기 후 진행합니다.'],
  ['음료는 무제한으로 리필 가능합니다.'],
  ['화장실은 한 곳이에요.', '쉬는 시간에 붐비고 수압이 약해서, 미리 해결하고 오시는 걸 추천합니다.'],
];

/** 등록을 마치고 라운지에 처음 들어오면 한 번 뜨는 준비사항. '확인했어요'를 체크해야 닫히고, 그 뒤로 이 폰에서는 다시 안 뜬다 (아래 링크로 다시 볼 수 있다). */
function Prep({ onClose }: { onClose: () => void }) {
  const [ok, setOk] = useState(false);
  return (
    <>
      <div className="dim" />
      <div className="sheet prep" role="dialog" aria-modal="true" aria-labelledby="prep-t">
        <div className="grab" />
        <p className="prep-eb">BEFORE YOU COME</p>
        <h3 id="prep-t">준비 사항</h3>
        <p className="ds">오셔서 이렇게 준비해 주세요</p>
        <ol>{PREP.map(([t, sub], i) => <li key={t}><em>{String(i + 1).padStart(2, '0')}</em><b>{t}</b>{sub && <small>{sub}</small>}</li>)}</ol>
        <button type="button" className={`agree${ok ? ' on' : ''}`} onClick={() => setOk(!ok)} aria-pressed={ok}><span className="chk" />위 내용을 모두 확인했어요</button>
        <button className="btn" disabled={!ok} onClick={onClose}>라운지로 가기</button>
      </div>
    </>
  );
}

export default function Lounge({ slug, initial, when, loveType, onEdit }: { slug: string; initial: LoungeView; when: string; loveType: number; onEdit: () => void }) {
  const [v, setV] = useState(initial);
  const me = v.cards.find((c) => c.me)!;
  const others = v.cards.filter((c) => !c.me);
  // 둘러앉을 자리: 내 양옆 2명 → 위 4명 → 남는 사람은 왼쪽·오른쪽 번갈아
  const rest = others.slice(2), sides = rest.slice(4);
  const ring = { b: others.slice(0, 2), t: rest.slice(0, 4), l: sides.filter((_, i) => i % 2 === 0), r: sides.filter((_, i) => i % 2 === 1) };
  // 오른쪽에 앉은 사람은 좌우를 뒤집어 가운데를 바라보게
  const person = (c: LoungeView['cards'][number], flip = false) => {
    const i = others.indexOf(c);
    return (
      <Drag key={c.id} className="lg-p" style={{ animationDelay: `${-(i * 0.7) % 4}s` }}>
        <Poke><Character shape={c.shape as Shape} color={c.color} acc={c.prop} size={60} delay={i * 0.9} flip={flip} /></Poke>
        <div className="lg-kw">{c.keywords.slice(0, 2).map((k) => <span key={k}>{k}</span>)}</div>
      </Drag>
    );
  };

  const refresh = useCallback(async () => {
    const j = await api<{ view: LoungeView }>(`/api/e/${slug}/lounge`);
    if (j.ok && j.view) setV(j.view);
  }, [slug]);

  // shortcut: 4초마다 새로 읽는다. 라운드 타이머 단계(계획서 Task 7)에서 Supabase 실시간 신호로 바꾸기.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 4000);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  const before = v.phase === 'before';
  const prepKey = `fl_prep2_${slug}`; // 체크 방식으로 바뀌어서 이미 닫은 폰에도 한 번 더 뜬다
  const [prep, setPrep] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem(prepKey)) setPrep(true); } catch { setPrep(true); } }, [prepKey]);
  const closePrep = () => { setPrep(false); try { localStorage.setItem(prepKey, '1'); } catch {} };

  return (
    <main className="lounge">
      <div className="lg-top">
        <a href="/" className="lg-home"><Icon name="back" />홈</a>
        {before && <button className="lnk" style={{ margin: 0 }} onClick={onEdit}>내 소개 수정</button>}
      </div>
      <header className="lg-head">
        <p>ROTATION LOUNGE</p>
        <h1>오늘의 라운지</h1>
        <span>{when} · 여 {v.counts.f} · 남 {v.counts.m}</span>
      </header>

      {/* 이상형 박스를 가운데 두고 사람들이 빙 둘러앉는다. 나는 아래 가운데. */}
      <section className="lg-ring">
        <div className="lg-side t">{ring.t.map((c, i) => person(c, i >= ring.t.length / 2))}</div>
        <div className="lg-side l">{ring.l.map((c) => person(c))}</div>
        <div className="lg-mid">
          {before ? <IdealCloud lists={IDEAL} /> : null}
          {others.length === 0 && <p className="empty" style={{ padding: '16px 0' }}>다른 분들이 들어오는 중이에요</p>}
        </div>
        <div className="lg-side r">{ring.r.map((c) => person(c, true))}</div>
        <div className="lg-side b">
          {ring.b.slice(0, 1).map((c) => person(c))}
          <div className="lg-me">
            <small>나</small>
            <Drag><Poke><Character shape={me.shape as Shape} color={me.color} acc={me.prop} size={92} /></Poke></Drag>
            <div className="lg-kw">{me.keywords.map((k) => <span key={k} className="on">{k}</span>)}</div>
            {me.number != null && <b className="lg-ho">{ho(me.gender, me.number)}</b>}
          </div>
          {ring.b.slice(1).map((c) => person(c, true))}
        </div>
      </section>

      <button className="lnk" onClick={() => setPrep(true)}>준비사항 다시 보기</button>

      <div className="ft">
        <div className="lg-mine">
          <span className="orb" style={{ ['--c' as string]: PALETTE[loveType], width: 28, height: 28, margin: 0, animation: 'none', flex: 'none' }} aria-hidden="true" />
          <span>{phrases(loveType).join(' · ')}</span>
        </div>
        {me.number != null && before && (
          <div className="lg-seat"><b>{ho(me.gender, me.number)}</b><span>첫 대화는 <em>{me.number}번 테이블</em>에서 시작해요</span></div>
        )}
        {!before && <p className="ds" style={{ margin: 0, textAlign: 'center' }}>{me.number == null ? '호 번호가 아직 없어요 · 진행자에게 알려주세요' : '곧 호스트가 라운드를 시작해요'}</p>}
      </div>
      {prep && <Prep onClose={closePrep} />}
    </main>
  );
}
