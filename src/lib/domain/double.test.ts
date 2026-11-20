import { describe, expect, it } from 'vitest';
import { chatOpensAt, preScreen, fit, mbtiSame, otherTeam, pairTeams, randomTeams, tablesFor, teamTable, type Team } from './double';

const A = (v: number) => Array(15).fill(v);

describe('double lounge', () => {
  it('pairs the least compatible man and woman first', () => {
    const fs = [{ id: 'f1', answers: A(1), mbti: 'INFP' }, { id: 'f2', answers: A(5), mbti: 'ESTJ' }];
    const ms = [{ id: 'm1', answers: A(1), mbti: 'INFP' }, { id: 'm2', answers: A(5), mbti: 'ESTJ' }];
    const t = pairTeams(fs, ms);
    expect(t.map((x) => x.f + x.m).sort()).toEqual(['f1m2', 'f2m1']);
    expect(t[0].mbtiSame).toBe(0);
    expect(fit(fs[0], ms[0])).toBeGreaterThan(fit(fs[0], ms[1]));
    expect(mbtiSame('INFP', 'ENFP')).toBe(3);
  });

  it('keeps even the best-fitting team as unfit as possible (greedy left an 83 here)', () => {
    const mk = (g: string, n: number) => ({ id: `${g}${n}`, answers: A(((n + (g === 'm' ? 2 : 0)) % 5) + 1), mbti: n % 2 ? 'INFP' : 'ESTJ' });
    const t = pairTeams([1, 2, 3, 4, 5].map((n) => mk('f', n)), [1, 2, 3, 4, 5].map((n) => mk('m', n)));
    expect(t).toHaveLength(5);
    expect(new Set(t.map((x) => x.m)).size).toBe(5);
    expect(Math.max(...t.map((x) => x.fit))).toBeLessThanOrEqual(60);
  });

  it('leaves extra people without a team', () => {
    expect(pairTeams([{ id: 'f1', answers: A(3), mbti: 'INFP' }], [{ id: 'm1', answers: A(3), mbti: 'INFP' }, { id: 'm2', answers: A(1), mbti: 'ESTJ' }])).toHaveLength(1);
  });

  it('every moving team meets every sitting team once; odd count rests one sitting team per round', () => {
    for (const n of [4, 5, 9, 10]) {
      const T = tablesFor(n);
      const teams: Team[] = Array.from({ length: n }, (_, i) => ({ no: i + 1, f: `f${i + 1}`, m: `m${i + 1}` }));
      const met = new Map<number, Set<number>>();
      for (let r = 1; r <= T; r++) {
        const tables = teams.map((t) => teamTable(t.no, r, T));
        for (let tb = 1; tb <= T; tb++) expect(tables.filter((x) => x === tb).length).toBeLessThanOrEqual(2);
        for (const t of teams.filter((t) => t.no > T)) {
          const o = otherTeam(t.f, r, teams, T);
          expect(o).toHaveLength(2);
          const sit = Number(o[0].slice(1));
          met.set(t.no, (met.get(t.no) ?? new Set()).add(sit));
        }
      }
      for (const t of teams.filter((t) => t.no > T)) expect(met.get(t.no)!.size).toBe(T);
      if (n % 2) expect(otherTeam('f1', 1, teams, T).length + otherTeam('f2', 1, teams, T).length).toBeGreaterThan(0);
    }
  });

  it('random pre-matching pairs everyone once, extras stay out', () => {
    const p = (id: string) => ({ id, answers: Array(15).fill(3), mbti: 'ENFP' });
    let s = 7; const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const made = randomTeams(['f1', 'f2', 'f3'].map(p), ['m1', 'm2'].map(p), rand);
    expect(made).toHaveLength(2);
    expect(new Set(made.map((t) => t.f)).size).toBe(2);
    expect(made.map((t) => t.m).sort()).toEqual(['m1', 'm2']);
  });
});

it('채팅방은 모임 이틀 전 0시(한국 시간)부터, 당일 라운지는 호스트가 연다', () => {
  const starts = '2026-12-06T10:00:00+09:00';
  expect(new Date(chatOpensAt(starts)).toISOString()).toBe('2026-12-03T15:00:00.000Z'); // 12/4 0시 KST
  expect(preScreen('before', 'auto', starts, Date.parse('2026-12-03T23:59:00+09:00'))).toBe('wait');
  expect(preScreen('before', 'auto', starts, Date.parse('2026-12-04T00:00:00+09:00'))).toBe('chat');
  expect(preScreen('before', 'chat', starts, Date.parse('2026-11-20T12:00:00+09:00'))).toBe('chat');
  expect(preScreen('before', 'lounge', starts, Date.parse('2026-11-20T12:00:00+09:00'))).toBe('lounge');
  expect(preScreen('talk', 'auto', starts, Date.parse('2026-11-20T12:00:00+09:00'))).toBe('lounge');
});
