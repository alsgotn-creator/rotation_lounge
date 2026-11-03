// 최종 선택 매칭 (계획서 Task 4). 서로 고른 경우만 매칭이다. 한쪽만 고른 선택은 어디에도 드러나지 않는다.
export type Choice = { fromId: string; toId: string };

/** 내가 고른 사람 중 그 사람도 나를 고른 사람 */
export function mutualMatches(choices: Choice[], me: string): string[] {
  const mine = choices.filter((c) => c.fromId === me).map((c) => c.toId);
  return [...new Set(mine)].filter((t) => choices.some((c) => c.fromId === t && c.toId === me));
}

/** 호스트용 매칭 커플 목록 (중복 없이) */
export function mutualPairs(choices: Choice[]): [string, string][] {
  const out = new Map<string, [string, string]>();
  for (const c of choices) {
    if (!choices.some((d) => d.fromId === c.toId && d.toId === c.fromId)) continue;
    const [a, b] = [c.fromId, c.toId].sort();
    out.set(`${a}|${b}`, [a, b]);
  }
  return [...out.values()];
}
