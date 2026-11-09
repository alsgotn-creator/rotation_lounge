import { describe, expect, test } from 'vitest';
import { canSee, metIds, pendingNotes } from '../../src/lib/domain/turns';
import { containsContact, layoutNotes, NOTE_MAX } from '../../src/lib/domain/notes';
import type { Round, Seated } from '../../src/lib/domain/seating';

const W = (n: number): Seated => ({ id: `f${n}`, gender: 'f', number: n });
const M = (n: number): Seated => ({ id: `m${n}`, gender: 'm', number: n });
const rd = (no: number, startedAt: number, extra: Partial<Round> = {}): Round => ({ no, startedAt, pausedAt: null, pausedTotalMs: 0, durationSec: 900, closedAt: null, ...extra });
const seated = [1, 2, 3].map(W).concat([1, 2, 3].map(M));

describe('reveal (7 minutes)', () => {
  test('nobody is revealed before 7 minutes', () => expect(metIds(W(1), [rd(1, 0)], 3, 1, seated, 400_000)).toEqual([]));
  test('only the person at my table, after 7 minutes', () => {
    expect(metIds(W(1), [rd(1, 0)], 3, 1, seated, 430_000)).toEqual(['m1']);
    expect(canSee('f1', 'm2', [rd(1, 0)], 3, 1, seated, 430_000)).toBe(false);
  });
  test('stays visible in later rounds and after the event moves on', () => {
    const rounds = [rd(1, 0, { closedAt: 900_000 }), rd(2, 900_000)];
    expect(metIds(W(1), rounds, 3, 1, seated, 1_000_000)).toEqual(['m1']);
  });
  test('round that ended before 7 minutes never reveals', () => {
    expect(metIds(W(1), [rd(1, 0, { closedAt: 300_000 })], 3, 1, seated, 9_000_000)).toEqual([]);
  });
  test('2:2 reveals both partners at the table', () => {
    const s2 = [1, 2, 3, 4].map(W).concat([1, 2, 3, 4].map(M));
    expect(metIds(W(1), [rd(1, 0)], 2, 2, s2, 430_000).sort()).toEqual(['m1', 'm2']);
  });
});

describe('pending rolling paper', () => {
  const none = new Set<string>();
  test('nothing while the round is still running', () => expect(pendingNotes(W(1), [rd(1, 0)], 3, 1, seated, none, 100_000, 'talk')).toEqual([]));
  test('after the round closes: one note for the partner', () => {
    expect(pendingNotes(W(1), [rd(1, 0, { closedAt: 900_000 })], 3, 1, seated, none, 1_000_000, 'talk')).toEqual([{ round: 1, toId: 'm1' }]);
  });
  test('time up counts even if the host has not pressed anything', () => {
    expect(pendingNotes(W(1), [rd(1, 0)], 3, 1, seated, none, 950_000, 'talk')).toHaveLength(1);
  });
  test('survives the next round (host pressed next while writing)', () => {
    const rounds = [rd(1, 0, { closedAt: 900_000 }), rd(2, 900_000)];
    expect(pendingNotes(W(1), rounds, 3, 1, seated, none, 1_000_000, 'talk')).toEqual([{ round: 1, toId: 'm1' }]);
  });
  test('skipped or written notes clear it', () => {
    const rounds = [rd(1, 0, { closedAt: 900_000 })];
    expect(pendingNotes(W(1), rounds, 3, 1, seated, new Set(['1:m1']), 1_000_000, 'talk')).toEqual([]);
  });
  test('2:2 gives one per partner, lower number first', () => {
    const s2 = [1, 2, 3, 4].map(W).concat([1, 2, 3, 4].map(M));
    expect(pendingNotes(W(1), [rd(1, 0, { closedAt: 900_000 })], 2, 2, s2, none, 1_000_000, 'talk').map((p) => p.toId)).toEqual(['m1', 'm2']);
  });
  test('only the last round in choice phase; none before/after', () => {
    const rounds = [rd(1, 0, { closedAt: 900_000 }), rd(2, 900_000, { closedAt: 1_800_000 })];
    expect(pendingNotes(W(1), rounds, 3, 1, seated, none, 2_000_000, 'choice')).toEqual([{ round: 2, toId: 'm2' }]);
    expect(pendingNotes(W(1), rounds, 3, 1, seated, none, 2_000_000, 'before')).toEqual([]);
    expect(pendingNotes(W(1), rounds, 3, 1, seated, none, 2_000_000, 'closing')).toEqual([]);
  });
});

describe('notes', () => {
  test('blocks contact info', () => {
    for (const t of ['010-1234-5678', '01012345678', '카톡 abc12', '@my.insta', '인스타 놀러와요']) expect(containsContact(t)).toBe(true);
  });
  test('allows normal messages', () => {
    for (const t of ['오늘 정말 즐거웠어요 :)', '마라톤 3번 완주 멋져요', '7시에 시작했죠']) expect(containsContact(t)).toBe(false);
  });
  test('limit', () => expect(NOTE_MAX).toBe(200));
  test('layout is deterministic and inside the sheet', () => {
    const a = layoutNotes(['x', 'y', 'z']);
    expect(a).toEqual(layoutNotes(['x', 'y', 'z']));
    for (const n of a) { expect(n.xPct).toBeGreaterThanOrEqual(6); expect(n.xPct).toBeLessThanOrEqual(80); expect(n.yPct).toBeGreaterThanOrEqual(6); expect(n.yPct).toBeLessThanOrEqual(80); expect(Math.abs(n.rotDeg)).toBeLessThanOrEqual(9); }
  });
});
