// 대기실에 보여줄 것 (계획서 Task 6의 PublicCard). 나이·직업·사는 곳·MBTI·응답은 절대 넣지 않는다.
export type PublicCard = {
  id: string; gender: 'f' | 'm'; number: number | null; shape: string; prop: string;
  color: number; // 캐릭터를 그리려면 필요 (캐릭터 색 = 연애 컬러)
  keywords: string[]; me: boolean;
};

type Row = { id: string; gender: 'f' | 'm'; number: number | null; shape: string; prop: string; love_type: number; keywords: string[]; excluded?: boolean };

/** 대기실 카드: 제외된 사람 빼고, 나를 맨 앞에 */
export function loungeCards(rows: Row[], meId: string): PublicCard[] {
  return rows
    .filter((r) => !r.excluded)
    .map((r) => ({ id: r.id, gender: r.gender, number: r.number, shape: r.shape, prop: r.prop, color: r.love_type, keywords: r.keywords, me: r.id === meId }))
    .sort((a, b) => Number(b.me) - Number(a.me));
}

/** 직사각형 배치 (호스트 큰 화면용): 오른쪽 열 1..⌈T/2⌉ 위→아래, 왼쪽 열 나머지 아래→위 (번호순 이동이 시계방향) */
export function seatColumns(T: number) {
  const half = Math.ceil(T / 2);
  const right = Array.from({ length: half }, (_, i) => i + 1);
  const left = Array.from({ length: T - half }, (_, i) => T - i); // 화면 위에서 아래로 그리는 순서
  return { left, right };
}
