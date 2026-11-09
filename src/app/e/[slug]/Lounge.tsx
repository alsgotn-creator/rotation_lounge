'use client';
import { useCallback, useEffect, useState } from 'react';
import { Character } from '../../../components/Character';
import { Icon } from '../../../components/Icon';
import { IdealCloud } from '../../../components/IdealCloud';
import { IDEAL } from '../../../lib/domain/ideal';
import { PALETTE, phrases } from '../../../lib/domain/loveType';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { LoungeView } from '../../../lib/server/lounge';
import type { PlayView } from '../../../lib/server/play';

const ho = (g: 'f' | 'm', n: number) => `${g === 'f' ? '여' : '남'}${n}호`;

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

export default function Lounge({ slug, initial, when, loveType, onEdit, recommendation }: { slug: string; initial: LoungeView; when: string; loveType: number; onEdit: () => void; recommendation?: PlayView['recommendation'] }) {
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
        <a href="/" className="lg-home"><Icon name="back" />홈</a>
        <span className="logo">플러팅<i>.</i>라운지</span>
        {before && <button className="lnk" style={{ margin: 0 }} onClick={onEdit}>내 소개 수정</button>}
      </div>
      <header className="lg-head">
        <p>ROTATION LOUNGE</p>
        <h1>오늘의 라운지</h1>
        <span>{when} · 여 {v.counts.f} · 남 {v.counts.m}</span>
        {recommendation && (typeof recommendation === 'string'
          ? <p className="lg-rec">가장 비슷한 사람은 모두 모이면 알려드릴게요 ✦</p>
          : <p className="lg-rec on">당신과 가장 비슷한 사람은 <b>{ho(recommendation.gender, recommendation.number!)}</b>분이에요!</p>)}
      </header>

      <section className="lg-me">
        <small>나</small>
        <Poke><Character shape={me.shape as Shape} color={me.color} prop={me.prop as Prop} size={128} /></Poke>
        <div className="lg-kw">{me.keywords.map((k) => <span key={k} className="on">{k}</span>)}</div>
        {me.number != null && <b className="lg-ho">{ho(me.gender, me.number)}</b>}
      </section>

      {others.length === 0
        ? <p className="empty">다른 분들이 들어오는 중이에요</p>
        : <section className="lg-crowd">
            {others.map((c, i) => (
              <div key={c.id} className="lg-p" style={{ animationDelay: `${-(i * 0.7) % 4}s` }}>
                <Poke><Character shape={c.shape as Shape} color={c.color} prop={c.prop as Prop} size={74} delay={i * 0.9} /></Poke>
                <div className="lg-kw">{c.keywords.slice(0, 2).map((k) => <span key={k}>{k}</span>)}</div>
              </div>
            ))}
          </section>}

      {before && <>
        <IdealCloud tone="f" title="여자분들이 적은 이상형" lists={IDEAL.f} />
        <IdealCloud tone="m" title="남자분들이 적은 이상형" lists={IDEAL.m} />
      </>}

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
