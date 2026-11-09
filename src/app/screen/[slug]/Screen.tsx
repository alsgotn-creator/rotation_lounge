'use client';
import { useCallback, useEffect, useState } from 'react';
import { Character } from '../../../components/Character';
import { FloorPlan, type TablePair } from '../../../components/FloorPlan';
import { RoundTimer } from '../../../components/RoundTimer';
import type { Round } from '../../../lib/domain/seating';
import type { Prop, Shape } from '../../../lib/domain/register';
import { cloud, IDEAL } from '../../../lib/domain/ideal';

type Pub = { gender: 'f' | 'm'; number: number | null; shape: string; prop: string; color: number; keywords: string[] };
type View = { phase: 'before' | 'talk' | 'choice' | 'closing'; total: number; round: Round | null; pairs: TablePair[]; resting: Pub[]; lounge: Pub[]; choiceProgress: { done: number; total: number } };

/** 진행자 큰 화면 (세로, 버튼 없음). 매칭 결과는 절대 보여주지 않는다. */
export default function Screen({ slug, k }: { slug: string; k: string }) {
  const [v, setV] = useState<View | null>(null);
  const [offset, setOffset] = useState(0);
  const [bad, setBad] = useState(false);
  const load = useCallback(async () => {
    const t0 = Date.now();
    const r = await fetch(`/api/screen/${slug}?k=${encodeURIComponent(k)}`, { cache: 'no-store' }).catch(() => null);
    if (r?.status === 404) return setBad(true);
    const j = await r?.json().catch(() => null);
    if (j?.ok) { setV(j.view); setOffset(j.serverNow - (t0 + Date.now()) / 2); }
  }, [slug, k]);
  // shortcut: 2초마다 새로 읽는다. 다음 단계에서 Supabase 실시간 신호로.
  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);

  if (bad) return <main className="bd"><h2 className="q">화면 링크가 맞지 않아요</h2><p className="ds">호스트 진행 화면의 ‘큰 화면 열기’로 다시 열어주세요.</p></main>;
  if (!v) return <main className="scr-big" />;

  return (
    <main className="scr-big">
      <header className="sb-head"><span className="logo">플러팅<i>.</i>라운지</span>
        <b>{{ before: '시작 전', talk: '대화', choice: '최종 선택', closing: '마무리' }[v.phase]}</b></header>

      {v.phase === 'talk' && v.round && <>
        <p className="sb-round">Round {v.round.no} <em>/ {v.total}</em></p>
        <RoundTimer round={v.round} offsetMs={offset} big />
        <FloorPlan pairs={v.pairs} />
        {v.resting.length > 0 && <p className="sb-rest">이번 라운드 쉬는 분 · {v.resting.map((p) => `${p.gender === 'f' ? '여' : '남'}${p.number}호`).join(', ')}</p>}
        <p className="sb-move">→ 다음 라운드에는 남자분이 반시계 방향으로 한 칸씩 ↺</p>
      </>}

      {(v.phase === 'before' || (v.phase === 'talk' && !v.round)) && <>
        <h1 className="sb-title">오늘의 라운지</h1>
        <p className="sb-move" style={{ marginTop: 6 }}>1라운드는 같은 번호끼리 앉아요 · 여1호 ↔ 남1호</p>
        <div className="sb-lounge">
          {v.lounge.map((p, i) => (
            <div key={i} className="lg-p" style={{ animationDelay: `${-(i * 0.6) % 4}s` }}>
              <Character shape={p.shape as Shape} color={p.color} prop={p.prop as Prop} size={92} delay={i * 0.8} />
              <div className="lg-kw">{p.keywords.slice(0, 1).map((kw) => <span key={kw}>{kw}</span>)}</div>
            </div>
          ))}
        </div>
        <IdealCloud title="여자분들이 적은 이상형" lists={IDEAL.f} />
        <IdealCloud title="남자분들이 적은 이상형" lists={IDEAL.m} />
      </>}

      {v.phase === 'choice' && <div className="sb-center"><h1 className="sb-title">최종 선택 중이에요</h1><p className="sb-move">마음이 간 분을 휴대폰에서 골라주세요</p><p className="sb-prog">{v.choiceProgress.done} <em>/ {v.choiceProgress.total}명 완료</em></p></div>}
      {v.phase === 'closing' && <div className="sb-center"><h1 className="sb-title">오늘 함께해 주셔서 고마워요</h1>
        <div className="sb-lounge" style={{ marginTop: 30 }}>{v.lounge.slice(0, 12).map((p, i) => <Character key={i} shape={p.shape as Shape} color={p.color} prop={p.prop as Prop} size={80} delay={i * 0.8} />)}</div></div>}
    </main>
  );
}

/** 가장 많이 적힌 키워드를 가운데 크게, 나머지는 주변에 작게. 숫자는 보여주지 않는다. */
function IdealCloud({ title, lists }: { title: string; lists: string[][] }) {
  const [top, ...rest] = cloud(lists);
  if (!top) return null;
  return (
    <section className="ic">
      <h2 className="ic-t">{title}</h2>
      <div className="ic-box">
        <b className="ic-top">{top.word}</b>
        {rest.map((w, i) => {
          const a = -Math.PI / 2 + (i + 0.5) * (2 * Math.PI / rest.length), r = i % 2 ? 1 : 0.78;
          return <span key={w.word} className="ic-w" style={{ left: `${50 + 42 * r * Math.cos(a)}%`, top: `${50 + 42 * r * Math.sin(a)}%`, fontSize: `${1.8 + 0.5 * w.count}vh` }}>{w.word}</span>;
        })}
      </div>
    </section>
  );
}
