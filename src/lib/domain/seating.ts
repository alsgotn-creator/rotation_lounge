// 자리·타이머 규칙 (계획서 Task 3).
// 한 테이블에 여자 g명 + 남자 g명(g = 1, 2, 3)이 앉는다. 호 번호 1..T*g 중 같은 '조'(g명씩 묶음)는 한 테이블이다.
// 여자 조는 자기 테이블에 그대로, 남자 조는 라운드마다 반시계 방향(번호가 줄어드는 쪽)으로 한 테이블씩 옮긴다.
export type Gender = 'f' | 'm';
export type Seated = { id: string; gender: Gender; number: number };
export type Round = { no: number; startedAt: number; pausedAt: number | null; pausedTotalMs: number; durationSec: number; closedAt: number | null };

/** 호 번호가 속한 조 (g=2: 1·2호 → 1조, 3·4호 → 2조) */
export const groupOf = (number: number, g = 1) => Math.ceil(number / g);

export const tableOf = (p: Seated, round: number, T: number, g = 1) => {
  const grp = groupOf(p.number, g);
  return p.gender === 'f' ? grp : ((((grp - 1 - (round - 1)) % T) + T) % T) + 1;
};

export function pairs(round: number, T: number, seated: Seated[], g = 1) {
  return Array.from({ length: T }, (_, i) => {
    const table = i + 1;
    return {
      table,
      f: seated.filter((p) => p.gender === 'f' && tableOf(p, round, T, g) === table),
      m: seated.filter((p) => p.gender === 'm' && tableOf(p, round, T, g) === table),
    };
  });
}

/** 같은 테이블의 이성 모두 (g=1이면 최대 1명) */
export const partnersOf = (p: Seated, round: number, T: number, seated: Seated[], g = 1) => {
  const t = tableOf(p, round, T, g);
  return seated.filter((o) => o.gender !== p.gender && tableOf(o, round, T, g) === t);
};

/** 1..round 중 상대가 있었던 라운드 수 ("N번째 만남") */
export const ordinal = (p: Seated, round: number, T: number, seated: Seated[], g = 1) =>
  Array.from({ length: round }, (_, i) => i + 1).filter((r) => partnersOf(p, r, T, seated, g).length > 0).length;

/** 일시정지를 뺀 진행 시간 (0..duration) */
export function elapsedMs(r: Round, now: number) {
  const end = r.closedAt ?? r.pausedAt ?? now;
  return Math.min(Math.max(end - r.startedAt - r.pausedTotalMs, 0), r.durationSec * 1000);
}
export const isTimeUp = (r: Round, now: number) => elapsedMs(r, now) >= r.durationSec * 1000;
export const REVEAL_MS = 420_000;
export const revealReached = (r: Round, now: number) => elapsedMs(r, now) >= REVEAL_MS;

/** 자리 이동 직후: 라운드는 만들어졌지만 진행자가 아직 '대화 시작'을 누르지 않았다 (멈춘 채로 시작). */
export const notStarted = (r: Round) => r.pausedAt != null && r.pausedAt === r.startedAt && r.pausedTotalMs === 0;
