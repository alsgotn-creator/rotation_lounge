import { describe, expect, it } from 'vitest';
import { fit, mbtiSame, otherTeam, pairTeams, tablesFor, teamTable, type Team } from './double';

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
});
