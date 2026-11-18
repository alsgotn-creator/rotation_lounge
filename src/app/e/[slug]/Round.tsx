'use client';
import { preload } from 'react-dom';
import { PAPER_FONTS_CSS } from '../../../lib/domain/notes';
import { useEffect, useRef, useState } from 'react';
import GameSheet from './GameSheet';
import { Character } from '../../../components/Character';
import { useNow } from '../../../components/RoundTimer';
import { elapsedMs, notStarted, REVEAL_MS } from '../../../lib/domain/seating';
import { PALETTE, typeName } from '../../../lib/domain/loveType';
import { ho, type PublicCard } from '../../../lib/domain/lounge';
import { doubleTopic, TOPIC_KINDS, type TopicState } from '../../../lib/domain/cards';
import { api } from '../../../lib/api';
import { Icon } from '../../../components/Icon';
import type { PlayView, Profile } from '../../../lib/server/play';
/** 남은 시간은 숫자 없이 막대로만: 내 캐릭터가 왼쪽에서 출발해 시간이 끝나면 오른쪽 끝에 도착한다. */
function Track({ round, offsetMs, me }: { round: NonNullable<PlayView['round']>; offsetMs: number; me: PublicCard | null }) {
  const now = useNow(offsetMs);
  const pct = Math.min(1, elapsedMs(round.timer, now) / (round.timer.durationSec * 1000)) * 100;
  return (
    <div className={`trk${pct >= 100 ? ' up' : ''}${round.timer.pausedAt ? ' paused' : ''}`} role="progressbar" aria-label="대화 시간" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="trk-bar"><i style={{ width: `${pct}%` }} /></div>
      {me && <span className="trk-me" style={{ left: `${pct}%` }}><Character shape={me.shape} color={me.color} acc={me.prop} size={48} /></span>}
    </div>
  );
}

/** 테이블에 마주 앉은 장면: 왼쪽은 나, 오른쪽은 이번 상대(들). 캐릭터 아랫단은 테이블이 가린다. */
function Scene({ me, partners, mate }: { me: PublicCard | null; partners: PublicCard[]; mate?: PublicCard | null }) {
  if (!partners.length) return null;
  const small = partners.length > 1;
  return (
    <div className="scene" aria-hidden="true">
      <div className={`scene-l${mate ? ' many' : ''}`}>{me && <Character shape={me.shape} color={me.color} acc={me.prop} size={mate ? 84 : 150} />}{mate && <Character shape={mate.shape} color={mate.color} acc={mate.prop} size={84} delay={3} />}</div>
      <div className={`scene-r${small ? ' many' : ''}`}>
        {partners.map((p, i) => <Character key={p.id} shape={p.shape} color={p.color} acc={p.prop} size={small ? 84 : 110} delay={i + 1} flip />)}
      </div>
      {/* 다리가 양끝에 있는 카페 테이블 (가운데 기둥 하나면 저울처럼 보인다) */}
      <svg className="scene-tbl" viewBox="0 0 360 80" fill="#fff" stroke="#111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M128 6h14v9a7 7 0 0 1-14 0zM142 8h3a3 3 0 0 1 0 6h-3M218 6h14v9a7 7 0 0 1-14 0zM218 8h-3a3 3 0 0 0 0 6h3" />
        <path d="M70 46v24M290 46v24" />
        <path d="M14 20h332v14H14z" />
        <path d="M30 34h300v12H30z" />
        <path d="M38 46v30M322 46v30" />
      </svg>
    </div>
  );
}

/** 더블 라운지 대화 주제: 같은 만남이면 모든 테이블이 같은 주제에서 시작하고, 한 명이 맛을 바꾸거나 넘기면 그 테이블 네 명이 같이 바뀐다. */
function Topic({ slug, round, topic, onChange }: { slug: string; round: number; topic: TopicState; onChange: () => Promise<void> }) {
  const [mine, setMine] = useState<TopicState | null>(null); // 누른 사람 화면은 서버 응답을 기다리지 않고 바로 바꾼다
  const { kind, step } = mine ?? topic;
  const go = async (t: TopicState) => {
    setMine(t);
    await api(`/api/e/${slug}/game`, { type: 'topic', ...t });
    await onChange();
    setMine(null);
  };
  return (
    <section className="tp">
      <div className="tp-h">
        <small>이번 대화 주제</small>
        <span className="tp-k">{TOPIC_KINDS.map(([k, label]) => <button key={k} type="button" aria-pressed={kind === k} onClick={() => k !== kind && go({ kind: k, step: 0 })}>{label}</button>)}</span>
      </div>
      <div className="tp-b">
        <button type="button" aria-label="이전 주제" onClick={() => go({ kind, step: step - 1 })}><Icon name="back" /></button>
        <p aria-live="polite"><span>{doubleTopic(kind, round, step)}</span></p>
        <button type="button" aria-label="다음 주제" onClick={() => go({ kind, step: step + 1 })}><Icon name="next" /></button>
      </div>
    </section>
  );
}

export function Reveal({ p, fresh, kw }: { p: Profile; fresh: boolean; kw: string[] }) {
  const [open, setOpen] = useState(false); // 컬러칩을 누르면 유형 풀이
  return (
    <div className="rv-box">
      {fresh && <span className="rv-new">✦ 방금 공개</span>}
      <div className="rv-grid">
        {[['나이', `${p.age}세`], ['직업', p.job], ['사는 곳', p.area], ['MBTI', p.mbti]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
      </div>
      {kw.length > 0 && <div className="lg-kw rv-kw">{kw.map((k) => <span key={k}>{k}</span>)}</div>}
      {p.similar !== null && <p className={`rv-sim${p.best ? ' best' : ''}`}>
        {p.best && <b>✦ 오늘 이성 중 나와 가장 비슷한 분이에요</b>}
        <span>연애 성향이 <em>{p.similar}%</em> 비슷해요</span>
      </p>}
      <button type="button" className="rv-love" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="orb" style={{ ['--c' as string]: PALETTE[p.color], width: 30, height: 30, margin: 0, animation: 'none', flex: 'none' }} aria-hidden="true" />
        <span className="rv-love-t"><b>{typeName(p.color)}</b>{open && p.phrases.map((t) => <span key={t} className="rv-love-p">{t}</span>)}</span>
        <small>{open ? '접기' : '풀이 보기'}</small>
        <i className="rv-love-i" aria-hidden="true"><Icon name="down" /></i>
      </button>
    </div>
  );
}

export default function Round({ slug, view, offsetMs, onRefresh, me }: { slug: string; view: PlayView; offsetMs: number; onRefresh: () => Promise<void>; me: PublicCard | null }) {
  const round = view.round!;
  preload(PAPER_FONTS_CSS, { as: 'style' }); // 대화하는 동안 미리 받아 두면 라운드 끝 쪽지 화면이 바로 뜬다
  const now = useNow(offsetMs);
  const revealedLocally = elapsedMs(round.timer, now) >= REVEAL_MS;
  const hasProfile = round.partners.some((p) => view.met[p.id]);

  // 5분이 지나면 서버에서 상대 정보를 가져온다 (아직 안 왔으면 1.5초마다 다시)
  useEffect(() => {
    if (!revealedLocally || hasProfile || round.partners.length === 0) return;
    onRefresh();
    const t = setInterval(onRefresh, 1500);
    return () => clearInterval(t);
  }, [revealedLocally, hasProfile, round.partners.length, onRefresh]);

  // '방금 공개' 표시는 화면이 열려 있는 동안 새로 공개된 사람에게만 10초
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    const ids = Object.keys(view.met);
    if (seen.current === null) { seen.current = new Set(ids); return; }
    const added = ids.filter((id) => !seen.current!.has(id));
    if (!added.length) return;
    added.forEach((id) => seen.current!.add(id));
    setFresh((f) => new Set([...f, ...added]));
    setTimeout(() => setFresh(new Set()), 10_000); // cleanup 으로 지우면 3초 뒤 다음 응답(view.met 새 객체)이 타이머를 끊어 배지가 영영 남는다
  }, [view.met]);

  const chip = round.partners.length === 0 ? null
    : view.double ? `${round.ordinal}번째 팀 · 상대 팀 ${round.oppositeCount}팀 중`
    : round.perTable === 1 ? `${round.ordinal}번째 이성 · ${round.oppositeCount}명 중`
    : `${round.ordinal}번째 테이블 · 이성 ${round.oppositeCount}명 중 ${round.partners.length}명`;
  // 카드로 보여줄 사람: 기본형은 상대 전부, 더블은 이성 두 명 (상대 팀 이성 + 내 파트너)
  const mate = view.double ? view.team?.partner ?? null : null;
  const cards = view.double ? [...round.partners.filter((p) => p.gender !== me?.gender), ...(mate && round.partners.length ? [mate] : [])] : round.partners;

  return (
    <main className="rnd">
      <div className="lg-top"><span className="logo">플러팅<i>.</i>라운지</span></div>
      <header className="rnd-head">
        <h1>만남 {round.no}<em> / {round.total}</em></h1>
        {chip && <span className="rnd-chip">{chip}</span>}
      </header>
      <Track round={round} offsetMs={offsetMs} me={me} />
      {notStarted(round.timer) && <p className="rnd-wait">자리를 옮겨 앉아주세요 · 진행자가 시작하면 시간이 흘러가요</p>}

      {view.double && view.team && <p className="rnd-team">{view.team.name ? `팀 ${view.team.name}` : '우리 팀'} · 파트너와 함께 앉아요</p>}
      {view.double && round.partners.length === 0 && <p className="rnd-wait">이번 만남은 쉬어가요 · 파트너와 작전을 짜보세요</p>}
      <Scene me={me} partners={round.partners} mate={mate} />
      {view.double && round.partners.length > 0 && view.topic && <Topic slug={slug} round={round.no} topic={view.topic} onChange={onRefresh} />}

      <section className={`pcs${view.double ? ' two' : ''}`}>
        {cards.map((p) => (
          <article className="pc" key={p.id}>
            <b className="pc-ho">{ho(p.gender, p.number)}{p.id === mate?.id && <small> · 파트너</small>}</b>
            {view.met[p.id]
              ? <Reveal p={view.met[p.id]} fresh={fresh.has(p.id)} kw={p.keywords} />
              : <p className="pc-wait">{view.double ? <>나이 · 직업 · MBTI는<br /><b>5분 뒤</b> 공개</> : <>나이 · 직업 · 사는 곳 · MBTI는 <b>5분 뒤</b>에 공개돼요</>}</p>}
          </article>
        ))}
      </section>

      {!view.double && round.partners.length > 0 && <GameSheet slug={slug} game={view.game} onChange={onRefresh} />}
      {round.partners.length > 0 && !hasProfile && (
        <div className="rnd-why">
          <p><span>신상정보를 바로 안 보여주는 이유는요, 조건과 정보를 모른 채,</span><span>그 사람 자체를 먼저 알아가길 바라는 컨셉이기 때문이에요.</span></p>
          <small>{view.double ? '위의 대화 주제나 테이블 위 종이를 보고 이야기해도 좋아요.' : '대화를 도와줄 위의 게임이나 테이블 위 종이를 보고 이야기해도 좋아요.'}</small>
        </div>
      )}
    </main>
  );
}
