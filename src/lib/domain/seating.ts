// 자리·타이머 규칙 (계획서 Task 3). 여자는 자기 번호 테이블에 그대로, 남자는 라운드마다 시계 방향으로 한 칸.
export type Gender = 'f' | 'm';
export type Seated = { id: string; gender: Gender; number: number };
export type Round = { no: number; startedAt: number; pausedAt: number | null; pausedTotalMs: number; durationSec: number; closedAt: number | null };

export const tableOf = (p: Seated, round: number, T: number) =>
  p.gender === 'f' ? p.number : ((p.number - 1 + round - 1) % T) + 1;

export function pairs(round: number, T: number, seated: Seated[]) {
  return Array.from({ length: T }, (_, i) => {
    const table = i + 1;
    return {
      table,
      f: seated.find((p) => p.gender === 'f' && tableOf(p, round, T) === table) ?? null,
      m: seated.find((p) => p.gender === 'm' && tableOf(p, round, T) === table) ?? null,
    };
  });
}

export function partnerOf(p: Seated, round: number, T: number, seated: Seated[]) {
  const t = tableOf(p, round, T);
  return seated.find((o) => o.gender !== p.gender && tableOf(o, round, T) === t) ?? null;
}

/** 1..round 중 상대가 있었던 라운드 수 ("N번째 이성") */
export const ordinal = (p: Seated, round: number, T: number, seated: Seated[]) =>
  Array.from({ length: round }, (_, i) => i + 1).filter((r) => partnerOf(p, r, T, seated)).length;

/** 일시정지를 뺀 진행 시간 (0..duration) */
export function elapsedMs(r: Round, now: number) {
  const end = r.closedAt ?? r.pausedAt ?? now;
  return Math.min(Math.max(end - r.startedAt - r.pausedTotalMs, 0), r.durationSec * 1000);
}
export const isTimeUp = (r: Round, now: number) => elapsedMs(r, now) >= r.durationSec * 1000;
export const REVEAL_MS = 420_000;
export const revealReached = (r: Round, now: number) => elapsedMs(r, now) >= REVEAL_MS;
