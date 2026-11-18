// 플러팅 더블 라운지 (2:2 파트너 모임) 규칙.
// 남녀 한 명씩이 한 팀(파트너), 한 테이블에 두 팀. 팀 1..T는 자기 테이블(번호 = 팀 번호)에 앉아 있고,
// 나머지 팀(T+1..N)은 라운드마다 다음 테이블로 함께 옮긴다. T = ⌈N/2⌉, 라운드 수 = T.
// 팀 수가 홀수면 라운드마다 앉아 있는 팀 하나는 상대 팀 없이 쉰다.
import { similarity } from './loveType';

export type Team = { no: number; f: string; m: string };

export const tablesFor = (teams: number) => Math.max(1, Math.ceil(teams / 2));

/** 팀이 그 라운드에 앉는 테이블 */
export const teamTable = (no: number, round: number, T: number) => (no <= T ? no : ((no - T - 1 + round - 1) % T) + 1);

/** 내 팀 (없으면 null) */
export const teamOf = <T extends Team>(id: string, teams: T[]) => teams.find((t) => t.f === id || t.m === id) ?? null;

/** 그 라운드에 같은 테이블에 앉은 다른 팀의 두 사람 (쉬는 라운드면 빈 배열) */
export function otherTeam(id: string, round: number, teams: Team[], T: number): string[] {
  const mine = teamOf(id, teams);
  if (!mine) return [];
  const t = teamTable(mine.no, round, T);
  const o = teams.find((x) => x.no !== mine.no && teamTable(x.no, round, T) === t);
  return o ? [o.f, o.m] : [];
}

/** MBTI 네 글자 중 같은 글자 수 */
export const mbtiSame = (a: string, b: string) => [0, 1, 2, 3].filter((i) => a[i] && a[i] === b[i]).length;

type P = { id: string; answers: number[]; mbti: string };

/** 잘 맞는 정도 0~100: 가치관 15문항 비슷한 정도 70% + MBTI 같은 글자 30% */
export const fit = (a: P, b: P) => Math.round(0.7 * similarity(a.answers, b.answers) + 0.3 * (mbtiSame(a.mbti, b.mbti) / 4) * 100);

/** 가장 안 맞는 남녀부터 차례로 짝짓는다. 남는 사람(성비가 다를 때)은 팀이 없다. */
export function pairTeams(fs: P[], ms: P[]): { f: string; m: string; fit: number; similar: number; mbtiSame: number }[] {
  const all = fs.flatMap((f) => ms.map((m) => ({ f, m, fit: fit(f, m) })));
  all.sort((a, b) => a.fit - b.fit || a.f.id.localeCompare(b.f.id) || a.m.id.localeCompare(b.m.id));
  const used = new Set<string>();
  const out: ReturnType<typeof pairTeams> = [];
  for (const x of all) {
    if (used.has(x.f.id) || used.has(x.m.id)) continue;
    used.add(x.f.id); used.add(x.m.id);
    out.push({ f: x.f.id, m: x.m.id, fit: x.fit, similar: similarity(x.f.answers, x.m.answers), mbtiSame: mbtiSame(x.f.mbti, x.m.mbti) });
  }
  return out;
}

/** 이상형 · 매력 포인트 (사전 등록, 파트너에게만 보인다) */
export const IDEAL_MAX = 60;
