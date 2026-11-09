'use client';
import { useEffect, useState } from 'react';
import { elapsedMs, REVEAL_MS, type Round } from '../lib/domain/seating';

/** 서버 시간 기준 남은 시간. offsetMs = 서버 시각 - 내 시각 */
export function useNow(offsetMs: number, tickMs = 250) {
  const [now, setNow] = useState(() => Date.now() + offsetMs);
  useEffect(() => { const t = setInterval(() => setNow(Date.now() + offsetMs), tickMs); return () => clearInterval(t); }, [offsetMs, tickMs]);
  return now;
}

const mmss = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export function RoundTimer({ round, offsetMs }: { round: Round; offsetMs: number }) {
  const now = useNow(offsetMs);
  const total = round.durationSec * 1000;
  const el = elapsedMs(round, now);
  const left = total - el;
  const state = round.closedAt ? '끝난 라운드' : left <= 0 ? '종료' : round.pausedAt ? '일시정지' : '남은 시간';
  return (
    <div className={`rt${left <= 0 || round.closedAt ? ' up' : ''}${round.pausedAt ? ' paused' : ''}`}>
      <span className="rt-l">{state}</span>
      <b className="rt-n" aria-live="off">{left <= 0 ? '0:00' : mmss(left)}</b>
      <div className="rt-bar"><i style={{ width: `${(el / total) * 100}%` }} /><em style={{ left: `${(REVEAL_MS / total) * 100}%` }}><span>7분 · 정보 공개</span></em></div>
    </div>
  );
}
