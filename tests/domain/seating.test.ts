import { describe, expect, test } from 'vitest';
import { elapsedMs, notStarted, ordinal, pairs, partnersOf, revealReached, tableOf, type Seated } from '../../src/lib/domain/seating';

const W = (n: number): Seated => ({ id: `f${n}`, gender: 'f', number: n });
const M = (n: number): Seated => ({ id: `m${n}`, gender: 'm', number: n });
const ids = (xs: Seated[]) => xs.map((x) => x.id);

describe('seating, 1:1 per table', () => {
  test('round 1 pairs equal numbers', () => {
    const seated = [W(1), W(2), M(1), M(2)];
    expect(ids(partnersOf(W(1), 1, 7, seated))).toEqual(['m1']);
    expect(ids(partnersOf(W(2), 1, 7, seated))).toEqual(['m2']);
  });
  test('men move to the next-numbered table each round, wrapping (남1호→여2호, 남7호→여1호)', () => {
    expect(tableOf(M(6), 3, 7)).toBe(1);
    expect(tableOf(M(7), 2, 7)).toBe(1);
    expect(tableOf(M(1), 2, 7)).toBe(2);
    expect(tableOf(W(2), 5, 7)).toBe(2);
  });
  test('uneven counts: someone sits out, ordinal skips that round', () => {
    const seated = [1, 2, 3, 4, 5, 6, 7].map(W).concat([1, 2, 3, 4, 5, 6].map(M));
    for (let r = 1; r <= 7; r++) expect(pairs(r, 7, seated).filter((p) => p.f.length && !p.m.length)).toHaveLength(1);
    expect(partnersOf(W(7), 1, 7, seated)).toEqual([]);
    expect(ordinal(W(7), 2, 7, seated)).toBe(1);
  });
  test('everyone meets everyone once over T rounds', () => {
    const seated = [1, 2, 3, 4, 5].map(W).concat([1, 2, 3, 4, 5].map(M));
    const met = new Set<string>();
    for (let r = 1; r <= 5; r++) for (const p of pairs(r, 5, seated)) met.add(`${p.f[0].id}-${p.m[0].id}`);
    expect(met.size).toBe(25);
  });
});

describe('seating, 2:2 and 3:3 per table', () => {
  test('round 1: 여1·2호 and 남1·2호 share table 1 (same numbers start together)', () => {
    const seated = [W(1), W(2), W(3), W(4), M(1), M(2), M(3), M(4)];
    const p = pairs(1, 2, seated, 2);
    expect(ids(p[0].f)).toEqual(['f1', 'f2']); expect(ids(p[0].m)).toEqual(['m1', 'm2']);
    expect(ids(p[1].f)).toEqual(['f3', 'f4']); expect(ids(p[1].m)).toEqual(['m3', 'm4']);
  });
  test('men move in pairs: round 2 puts 남1·2호 with 여3·4호', () => {
    const seated = [W(1), W(2), W(3), W(4), M(1), M(2), M(3), M(4)];
    const t2 = pairs(2, 2, seated, 2)[1];
    expect(ids(t2.f)).toEqual(['f3', 'f4']); expect(ids(t2.m)).toEqual(['m1', 'm2']);
    expect(ids(partnersOf(W(3), 2, 2, seated, 2))).toEqual(['m1', 'm2']);
  });
  test('3:3, 3 tables: everyone meets everyone once over 3 rounds', () => {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const seated = nums.map(W).concat(nums.map(M));
    const met = new Set<string>();
    for (let r = 1; r <= 3; r++) for (const t of pairs(r, 3, seated, 3)) { expect(t.f).toHaveLength(3); expect(t.m).toHaveLength(3); for (const f of t.f) for (const m of t.m) met.add(`${f.id}-${m.id}`); }
    expect(met.size).toBe(81);
  });
  test('half-filled group still works (one woman, two men at a table)', () => {
    const seated = [W(1), M(1), M(2)];
    expect(ids(partnersOf(W(1), 1, 2, seated, 2))).toEqual(['m1', 'm2']);
    expect(ordinal(W(1), 2, 2, seated, 2)).toBe(1); // 2라운드는 상대 없음
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

describe('round starts paused after the seat move', () => {
  test('no time passes until the host starts it', () => {
    const r = { no: 2, startedAt: 1000, pausedAt: 1000, pausedTotalMs: 0, durationSec: 720, closedAt: null };
    expect(notStarted(r)).toBe(true);
    expect(elapsedMs(r, 1000 + 5 * 60e3)).toBe(0);
    const started = { ...r, pausedAt: null, pausedTotalMs: 5 * 60e3 };
    expect(notStarted(started)).toBe(false);
    expect(elapsedMs(started, 1000 + 6 * 60e3)).toBe(60e3);
    expect(notStarted({ ...started, pausedAt: 1000 + 7 * 60e3 })).toBe(false); // 중간 일시정지는 시작 전이 아니다
  });
});
