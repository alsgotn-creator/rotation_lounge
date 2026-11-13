/**
 * 참가자가 적어준 이상형을 진행자가 키워드로 정리한 것. 재미용 —
 * 누가 적었는지, 누가 몇 표 받았는지는 절대 보여주지 않는다.
 * shortcut: 이벤트 하나 분량을 손으로 넣어둔다. 여러 이벤트를 돌리면 events 테이블로.
 */
export const IDEAL: Record<'f' | 'm', string[][]> = {
  // 15일 모임 참가자가 적은 것만 (2026-11-13 정리). 키워드를 받으면 한 사람당 한 줄씩 추가
  f: [
    ['다정한', '자기관리하는'],
  ],
  m: [],
};

/** 많이 적힌 순서(같으면 먼저 나온 순서)로 키워드와 횟수. */
export function cloud(lists: string[][]) {
  const n = new Map<string, number>();
  for (const l of lists) for (const w of new Set(l)) n.set(w, (n.get(w) ?? 0) + 1);
  return [...n].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
}
