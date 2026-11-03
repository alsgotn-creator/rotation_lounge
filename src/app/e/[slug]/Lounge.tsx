'use client';
import { useCallback, useEffect, useState } from 'react';
import { Character } from '../../../components/Character';
import { PALETTE, phrases } from '../../../lib/domain/loveType';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { LoungeView } from '../../../lib/server/lounge';

const ho = (g: 'f' | 'm', n: number) => `${g === 'f' ? '여' : '남'}${n}호`;

export default function Lounge({ slug, initial, when, loveType, onEdit }: { slug: string; initial: LoungeView; when: string; loveType: number; onEdit: () => void }) {
  const [v, setV] = useState(initial);
  const me = v.cards.find((c) => c.me)!;
  const others = v.cards.filter((c) => !c.me);

  const refresh = useCallback(async () => {
    const r = await fetch(`/api/e/${slug}/lounge`, { cache: 'no-store' }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (j?.ok) setV(j.view);
  }, [slug]);

  // shortcut: 4초마다 새로 읽는다. 라운드 타이머 단계(계획서 Task 7)에서 Supabase 실시간 신호로 바꾸기.
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && refresh(), 4000);
    const onVis = () => document.visibilityState === 'visible' && refresh();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  const before = v.phase === 'before';

  return (
    <main className="lounge">
      <div className="lg-top">
        <span className="logo">플러팅<i>.</i>라운지</span>
        {before && <button className="lnk" style={{ margin: 0 }} onClick={onEdit}>내 소개 수정</button>}
      </div>
      <header className="lg-head">
        <p>ROTATION LOUNGE</p>
        <h1>오늘의 라운지</h1>
        <span>{when} · 여 {v.counts.f} · 남 {v.counts.m}</span>
      </header>

      <section className="lg-me">
        <small>나</small>
        <Character shape={me.shape as Shape} color={me.color} prop={me.prop as Prop} size={128} />
        <div className="lg-kw">{me.keywords.map((k) => <span key={k} className="on">{k}</span>)}</div>
        {me.number != null && <b className="lg-ho">{ho(me.gender, me.number)}</b>}
      </section>

      {others.length === 0
        ? <p className="empty">다른 분들이 들어오는 중이에요</p>
        : <section className="lg-crowd">
            {others.map((c, i) => (
              <div key={c.id} className="lg-p" style={{ animationDelay: `${-(i * 0.7) % 4}s` }}>
                <Character shape={c.shape as Shape} color={c.color} prop={c.prop as Prop} size={74} delay={i * 0.9} />
                <div className="lg-kw">{c.keywords.slice(0, 2).map((k) => <span key={k}>{k}</span>)}</div>
              </div>
            ))}
          </section>}

      <div className="ft">
        <div className="lg-mine">
          <span className="orb" style={{ ['--c' as string]: PALETTE[loveType], width: 28, height: 28, margin: 0, animation: 'none', flex: 'none' }} aria-hidden="true" />
          <span>{phrases(loveType).join(' · ')}</span>
        </div>
        {me.number != null && before && (
          <div className="lg-seat"><b>{ho(me.gender, me.number)}</b><span>첫 대화는 <em>{me.number}번 테이블</em>에서 시작해요</span></div>
        )}
        {!before && <p className="note" style={{ margin: 0 }}>곧 호스트가 라운드를 시작해요</p>}
      </div>
    </main>
  );
}
