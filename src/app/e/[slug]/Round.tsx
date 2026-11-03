'use client';
import { useEffect, useRef, useState } from 'react';
import GameSheet from './GameSheet';
import { Character } from '../../../components/Character';
import { useNow } from '../../../components/RoundTimer';
import { elapsedMs, REVEAL_MS } from '../../../lib/domain/seating';
import { PALETTE } from '../../../lib/domain/loveType';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { PlayView, Profile } from '../../../lib/server/play';

const ho = (g: 'f' | 'm', n: number | null) => `${g === 'f' ? '여' : '남'}${n}호`;
const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const R = 96, C = 2 * Math.PI * R;

function Ring({ round, offsetMs }: { round: NonNullable<PlayView['round']>; offsetMs: number }) {
  const now = useNow(offsetMs);
  const total = round.timer.durationSec * 1000, el = elapsedMs(round.timer, now), left = total - el;
  const label = left <= 0 ? '종료' : round.timer.pausedAt ? '일시정지' : '남은 시간';
  return (
    <div className={`ring${left <= 0 ? ' up' : ''}${round.timer.pausedAt ? ' paused' : ''}`} role="timer" aria-label={`남은 시간 ${mmss(Math.max(left, 0))}`}>
      <svg viewBox="0 0 220 220" aria-hidden="true">
        <circle cx="110" cy="110" r={R} className="ring-bg" />
        <circle cx="110" cy="110" r={R} className="ring-fg" strokeDasharray={C} strokeDashoffset={C * Math.min(el / total, 1)} transform="rotate(-90 110 110)" />
      </svg>
      <div className="ring-in"><small>{label}</small><b>{left <= 0 ? '0:00' : mmss(left)}</b></div>
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

export default function Round({ slug, view, offsetMs, onRefresh }: { slug: string; view: PlayView; offsetMs: number; onRefresh: () => void }) {
  const round = view.round!;
  const [gameOpen, setGameOpen] = useState(false);
  const g = view.game, waiting = !!g && !g.mine; // 상대가 카드를 뽑았고 아직 내가 답 전
  const now = useNow(offsetMs);
  const revealedLocally = elapsedMs(round.timer, now) >= REVEAL_MS;
  const hasProfile = round.partners.some((p) => view.met[p.id]);

  // 7분이 지나면 서버에서 상대 정보를 가져온다 (아직 안 왔으면 1.5초마다 다시)
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
      <Ring round={round} offsetMs={offsetMs} />

      {round.partners.length === 0 ? (
        <div className="rest"><h2 className="q" style={{ textAlign: 'center' }}>이번 라운드는<br />쉬어가요</h2><p className="ds" style={{ textAlign: 'center' }}>잠깐 숨 돌리고, 다음 라운드를 기다려요.</p></div>
      ) : (
        <section className={`pcs${many ? ' many' : ''}`}>
          {round.partners.map((p) => (
            <article className="pc" key={p.id}>
              <Character shape={p.shape as Shape} color={p.color} prop={p.prop as Prop} size={many ? 92 : 128} />
              <b className="pc-ho">{ho(p.gender, p.number)}</b>
              <div className="lg-kw">{p.keywords.map((k) => <span key={k}>{k}</span>)}</div>
              {view.met[p.id]
                ? <Reveal p={view.met[p.id]} fresh={fresh.has(p.id)} />
                : <p className="pc-wait">나이 · 직업 · 사는 곳 · MBTI는 <b>7분째</b>에 공개돼요</p>}
            </article>
          ))}
        </section>
      )}

      {round.partners.length > 0 && (
        <div className="ft">
          <button className={`btn sub${waiting ? ' gm-ping' : ''}`} onClick={() => setGameOpen(true)}>{waiting ? '✦ 카드가 도착했어요' : '✦ 같이 해보기'}</button>
        </div>
      )}
      {gameOpen && <GameSheet slug={slug} game={g} onClose={() => setGameOpen(false)} onChange={onRefresh} />}
    </main>
  );
}
