'use client';
import { useEffect, useRef, useState } from 'react';
import GameSheet from './GameSheet';
import { Character } from '../../../components/Character';
import { useNow } from '../../../components/RoundTimer';
import { elapsedMs, notStarted, REVEAL_MS } from '../../../lib/domain/seating';
import { PALETTE } from '../../../lib/domain/loveType';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { PlayView, Profile } from '../../../lib/server/play';
import type { PublicCard } from '../../../lib/domain/lounge';

const ho = (g: 'f' | 'm', n: number | null) => `${g === 'f' ? '여' : '남'}${n}호`;
/** 남은 시간은 숫자 없이 막대로만: 내 캐릭터가 왼쪽에서 출발해 시간이 끝나면 오른쪽 끝에 도착한다. */
function Track({ round, offsetMs, me }: { round: NonNullable<PlayView['round']>; offsetMs: number; me: PublicCard | null }) {
  const now = useNow(offsetMs);
  const pct = Math.min(1, elapsedMs(round.timer, now) / (round.timer.durationSec * 1000)) * 100;
  return (
    <div className={`trk${pct >= 100 ? ' up' : ''}${round.timer.pausedAt ? ' paused' : ''}`} role="progressbar" aria-label="대화 시간" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="trk-bar"><i style={{ width: `${pct}%` }} /></div>
      {me && <span className="trk-me" style={{ left: `${pct}%` }}><Character shape={me.shape as Shape} color={me.color} prop={me.prop as Prop} size={48} /></span>}
    </div>
  );
}

export function Reveal({ p, fresh }: { p: Profile; fresh: boolean }) {
  return (
    <div className="rv-box">
      {fresh && <span className="rv-new">✦ 방금 공개</span>}
      <div className="rv-grid">
        {[['나이', `${p.age}세`], ['직업', p.job], ['사는 곳', p.area], ['MBTI', p.mbti]].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
      </div>
      <div className="rv-love">
        <span className="orb" style={{ ['--c' as string]: PALETTE[p.color], width: 30, height: 30, margin: 0, animation: 'none', flex: 'none' }} aria-hidden="true" />
        <div>{p.phrases.map((t) => <p key={t}>{t}</p>)}</div>
      </div>
    </div>
  );
}

export default function Round({ slug, view, offsetMs, onRefresh, me }: { slug: string; view: PlayView; offsetMs: number; onRefresh: () => void; me: PublicCard | null }) {
  const round = view.round!;
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
    const t = setTimeout(() => setFresh(new Set()), 10_000);
    return () => clearTimeout(t);
  }, [view.met]);

  const many = round.partners.length > 1;
  const chip = round.partners.length === 0 ? null
    : round.perTable === 1 ? `${round.ordinal}번째 이성 · ${round.oppositeCount}명 중`
    : `${round.ordinal}번째 테이블 · 이성 ${round.oppositeCount}명 중 ${round.partners.length}명`;

  return (
    <main className="rnd">
      <div className="lg-top"><span className="logo">플러팅<i>.</i>라운지</span></div>
      <header className="rnd-head">
        <h1>Round {round.no}<em> / {round.total}</em></h1>
        {chip && <span className="rnd-chip">{chip}</span>}
      </header>
      <Track round={round} offsetMs={offsetMs} me={me} />
      {notStarted(round.timer) && <p className="rnd-wait">자리를 옮겨 앉아주세요 · 진행자가 시작하면 시간이 흘러가요</p>}

      <section className={`pcs${many ? ' many' : ''}`}>
        {round.partners.map((p) => (
          <article className="pc" key={p.id}>
            <Character shape={p.shape as Shape} color={p.color} prop={p.prop as Prop} size={many ? 92 : 128} />
            <b className="pc-ho">{ho(p.gender, p.number)}</b>
            <div className="lg-kw">{p.keywords.map((k) => <span key={k}>{k}</span>)}</div>
            {view.met[p.id]
              ? <Reveal p={view.met[p.id]} fresh={fresh.has(p.id)} />
              : <p className="pc-wait">나이 · 직업 · 사는 곳 · MBTI는 <b>5분 뒤</b>에 공개돼요</p>}
          </article>
        ))}
      </section>

      {round.partners.length > 0 && !hasProfile && (
        <div className="rnd-why">
          <p><span>신상정보를 바로 안 보여주는 이유는요, 조건과 정보를 모른 채,</span><span>그 사람 자체를 먼저 알아가길 바라는 컨셉이기 때문이에요.</span></p>
          <small>대화를 도와줄 아래 게임이나 테이블 위 종이를 보고 이야기해도 좋아요.</small>
        </div>
      )}
      {round.partners.length > 0 && <GameSheet slug={slug} game={view.game} onChange={onRefresh} />}
    </main>
  );
}
