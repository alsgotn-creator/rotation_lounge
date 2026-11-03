import { describe, expect, test } from 'vitest';
import { elapsedMs, ordinal, pairs, partnerOf, revealReached, tableOf, type Seated } from '../../src/lib/domain/seating';

const W = (n: number): Seated => ({ id: `f${n}`, gender: 'f', number: n });
const M = (n: number): Seated => ({ id: `m${n}`, gender: 'm', number: n });

describe('seating', () => {
  test('round 1 pairs equal numbers', () => {
    const seated = [W(1), W(2), M(1), M(2)];
    expect(partnerOf(W(1), 1, 7, seated)?.id).toBe('m1');
    expect(partnerOf(W(2), 1, 7, seated)?.id).toBe('m2');
  });
  test('men move one table clockwise each round, wrapping', () => {
    expect(tableOf(M(6), 3, 7)).toBe(1); // 3라운드: 남6호 → 1번 테이블
    expect(tableOf(M(7), 2, 7)).toBe(1);
    expect(tableOf(W(2), 5, 7)).toBe(2); // 여자는 그대로
  });
  test('uneven counts: someone sits out, ordinal skips that round', () => {
    const seated = [1, 2, 3, 4, 5, 6, 7].map(W).concat([1, 2, 3, 4, 5, 6].map(M));
    for (let r = 1; r <= 7; r++) expect(pairs(r, 7, seated).filter((p) => p.f && !p.m)).toHaveLength(1);
    expect(partnerOf(W(7), 1, 7, seated)).toBeNull();
    expect(ordinal(W(7), 2, 7, seated)).toBe(1);
  });
  test('everyone meets everyone once over T rounds', () => {
    const seated = [1, 2, 3, 4, 5].map(W).concat([1, 2, 3, 4, 5].map(M));
    const met = new Set<string>();
    for (let r = 1; r <= 5; r++) for (const p of pairs(r, 5, seated)) met.add(`${p.f!.id}-${p.m!.id}`);
    expect(met.size).toBe(25);
  });
});

describe('timer', () => {
  const r = { no: 1, startedAt: 0, pausedAt: null, pausedTotalMs: 0, durationSec: 900, closedAt: null };
  test('clamped to duration', () => expect(elapsedMs(r, 1_000_000)).toBe(900_000));
  test('reveal waits for 7 min of un-paused time', () => expect(revealReached({ ...r, pausedTotalMs: 60_000 }, 450_000)).toBe(false));
  test('paused at 5:00 never reaches reveal while paused', () => expect(revealReached({ ...r, pausedAt: 300_000 }, 999_999)).toBe(false));
  test('stays revealed after close', () => expect(revealReached({ ...r, closedAt: 430_000 }, 2_000_000)).toBe(true));
  test('closed before 7 min → never revealed', () => expect(revealReached({ ...r, closedAt: 400_000 }, 2_000_000)).toBe(false));
});
