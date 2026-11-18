// 누가 누구의 정보를 볼 수 있는지, 라운드 뒤에 어떤 롤링페이퍼가 밀려 있는지 (계획서 Task 3·6)
import { isTimeUp, partnersOf, revealReached, type Round, type Seated } from './seating';

/** 5분 이상 함께 앉았던 이성 전원. 한 번 공개되면 행사가 끝날 때까지 계속 볼 수 있다. anyTime: 최종선택 때는 시간과 상관없이 같이 앉았던 사람 모두. */
// at: 그 라운드에 같은 테이블에 앉은 상대들. 기본은 로테이션 규칙, 더블 라운지는 상대 팀 두 사람을 넘긴다.
export function metIds(viewer: Seated, rounds: Round[], T: number, g: number, seated: Seated[], now: number, anyTime = false, at = (r: number) => partnersOf(viewer, r, T, seated, g)) {
  const out = new Set<string>();
  for (const r of rounds) if (anyTime || revealReached(r, now)) for (const p of at(r.no)) out.add(p.id);
  return [...out];
}

export const canSee = (viewerId: string, targetId: string, rounds: Round[], T: number, g: number, seated: Seated[], now: number) => {
  const v = seated.find((s) => s.id === viewerId);
  return !!v && metIds(v, rounds, T, g, seated, now).includes(targetId);
};

export type Pending = { round: number; toId: string };

/**
 * 아직 안 쓴 롤링페이퍼. 라운드가 끝났거나 시간이 다 된 뒤, 그 라운드의 상대마다 하나씩.
 * 대화 단계이거나, 최종 선택 단계에서는 마지막 라운드만. (쓰는 중에 호스트가 다음 라운드를 눌러도 남아 있다)
 */
export function pendingNotes(me: Seated, rounds: Round[], T: number, g: number, seated: Seated[], done: Set<string>, now: number, phase: string, at = (r: number) => partnersOf(me, r, T, seated, g)): Pending[] {
  if (phase !== 'talk' && phase !== 'choice') return [];
  const last = rounds.at(-1)?.no;
  const out: Pending[] = [];
  for (const r of rounds) {
    if (!(r.closedAt || isTimeUp(r, now))) continue;
    if (phase === 'choice' && r.no !== last) continue;
    for (const p of [...at(r.no)].sort((a, b) => a.gender.localeCompare(b.gender) || a.number - b.number)) if (!done.has(`${r.no}:${p.id}`)) out.push({ round: r.no, toId: p.id });
  }
  return out;
}
