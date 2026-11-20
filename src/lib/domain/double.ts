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

/**
 * 모든 팀이 최대한 안 맞게 짝짓는다: 가장 잘 맞는 팀의 fit이 가장 낮아지는 짝짓기(병목 매칭).
 * 차례로 가장 안 맞는 쌍부터 집으면 마지막에 남은 사람끼리 잘 맞는 팀이 생겨서 이렇게 한다.
 * 남는 사람(성비가 다를 때)은 팀이 없다.
 */
export function pairTeams(fs: P[], ms: P[]): { f: string; m: string; fit: number; similar: number; mbtiSame: number }[] {
  const k = Math.min(fs.length, ms.length);
  const F = fs.map((f) => ms.map((m) => fit(f, m)));
  const order = F.map((row) => row.map((_, j) => j).sort((a, b) => row[a] - row[b] || a - b));
  const match = (cap: number) => {
    const owner: number[] = Array(ms.length).fill(-1); // 남자 j의 파트너 여자 index
    const tryF = (i: number, seen: boolean[]): boolean => {
      for (const j of order[i]) {
        if (F[i][j] > cap || seen[j]) continue;
        seen[j] = true;
        if (owner[j] < 0 || tryF(owner[j], seen)) { owner[j] = i; return true; }
      }
      return false;
    };
    let n = 0;
    for (let i = 0; i < fs.length && n < k; i++) if (tryF(i, [])) n++;
    return n === k ? owner : null;
  };
  let owner: number[] = [];
  for (const cap of [...new Set(F.flat())].sort((a, b) => a - b)) { const o = match(cap); if (o) { owner = o; break; } }
  return owner.flatMap((i, j) => {
    if (i < 0) return [];
    const f = fs[i], m = ms[j];
    return [{ f: f.id, m: m.id, fit: F[i][j], similar: similarity(f.answers, m.answers), mbtiSame: mbtiSame(f.mbti, m.mbti) }];
  }).sort((a, b) => a.fit - b.fit);
}

/** 사전 랜덤 매칭: 성향과 상관없이 남녀를 무작위로 짝짓는다. 남는 사람(성비가 다를 때)은 팀이 없다. */
export function randomTeams(fs: P[], ms: P[], rand: () => number = Math.random): { f: string; m: string; fit: number; similar: number; mbtiSame: number }[] {
  const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const F = shuffle(fs), M = shuffle(ms);
  return F.slice(0, Math.min(F.length, M.length)).map((f, i) => {
    const m = M[i];
    return { f: f.id, m: m.id, fit: fit(f, m), similar: similarity(f.answers, m.answers), mbtiSame: mbtiSame(f.mbti, m.mbti) };
  });
}

/** 이상형 · 매력 포인트 (사전 등록, 파트너에게만 보인다) */
export const IDEAL_MAX = 60;

/** 시작 전 참가자 화면 설정 (호스트가 고른다). auto = 이틀 전부터 채팅방, chat = 지금 채팅방, lounge = 당일 라운지 */
export type PreStage = 'auto' | 'chat' | 'lounge';
export const PRE_STAGES: PreStage[] = ['auto', 'chat', 'lounge'];

const KST = 9 * 3600e3;
/** 파트너 채팅방이 열리는 시각: 모임 날짜(한국 시간) 이틀 전 0시 */
export function chatOpensAt(startsAt: string | number) {
  const k = new Date(new Date(startsAt).getTime() + KST);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() - 2) - KST;
}

/** 지금 더블 라운지 참가자 화면: wait = 채팅방 열리기 전, chat = 채팅방만, lounge = 라운지(채팅방은 카드로) */
export function preScreen(phase: string, stage: PreStage, startsAt: string | number, now = Date.now()): 'wait' | 'chat' | 'lounge' {
  if (phase !== 'before' || stage === 'lounge') return 'lounge';
  if (stage === 'chat' || now >= chatOpensAt(startsAt)) return 'chat';
  return 'wait';
}
