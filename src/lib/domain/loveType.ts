// 연애 컬러 16유형 (계획서 Task 2, 스펙 §5)
export type Axis = 0 | 1 | 2 | 3; // 거리감 · 표현 · 데이트 · 미래

export const QUESTIONS: { text: string; axis: Axis; reversed: boolean }[] = [
  { text: '연인과는 하루에도 여러 번 연락하는 게 좋아요.', axis: 0, reversed: false },
  { text: '주말은 대부분 연인과 함께 보내고 싶어요.', axis: 0, reversed: false },
  { text: '연애 중에도 혼자만의 시간이 꼭 필요해요.', axis: 0, reversed: true },
  { text: '연인의 친구들과도 자주 어울리고 싶어요.', axis: 0, reversed: false },
  { text: '좋아하는 마음은 바로 표현하는 편이에요.', axis: 1, reversed: false },
  { text: '서운한 일이 생기면 그날 바로 이야기해요.', axis: 1, reversed: false },
  { text: '말보다 행동으로 마음을 보여주는 편이에요.', axis: 1, reversed: true },
  { text: '먼저 연락하거나 고백하는 게 어렵지 않아요.', axis: 1, reversed: false },
  { text: '집에서 영화 보며 쉬는 데이트가 제일 좋아요.', axis: 2, reversed: false },
  { text: '새로운 맛집이나 장소를 찾아다니는 게 좋아요.', axis: 2, reversed: true },
  { text: '계획 없이 동네를 산책하는 데이트가 좋아요.', axis: 2, reversed: false },
  { text: '연애를 시작할 때 결혼 가능성도 생각해요.', axis: 3, reversed: false },
  { text: '1~2년 뒤 함께할 계획을 이야기하는 게 좋아요.', axis: 3, reversed: false },
  { text: '미래보다 지금 함께 즐거운 게 더 중요해요.', axis: 3, reversed: true },
  { text: '돈 관리나 사는 곳 같은 현실 얘기도 일찍 나누고 싶어요.', axis: 3, reversed: false },
];

export const normalize = (answers: number[]) => answers.map((a, i) => (QUESTIONS[i].reversed ? 6 - a : a));

/** 축 평균이 3 이상이면 A(0), 아니면 B(1). type = 거리감<<3 | 표현<<2 | 데이트<<1 | 미래 */
export function loveType(answers: number[]) {
  const n = normalize(answers);
  let type = 0;
  for (const axis of [0, 1, 2, 3] as Axis[]) {
    const vals = n.filter((_, i) => QUESTIONS[i].axis === axis);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (mean < 3) type |= 1 << (3 - axis);
  }
  return type;
}

export const PALETTE = [
  '#B8435E', '#D46A82', '#E895A8', '#F4BFCB', '#7E4A8C', '#9C6BB0', '#BB93CC', '#D9BDE6',
  '#C2603F', '#DB835F', '#EBA584', '#F5C9AE', '#3F6E9E', '#5E8FC0', '#86B0D8', '#B5D2EE',
];

const PHRASES: [string, string][] = [
  ['자주 연락하며 곁에 있고 싶어요', '각자의 시간도 소중히 여겨요'],
  ['마음은 바로바로 표현해요', '천천히, 은근하게 다가가요'],
  ['둘만의 아늑한 데이트가 좋아요', '함께 새로운 곳을 걷는 게 좋아요'],
  ['함께할 미래를 그려보는 게 좋아요', '지금 이 순간에 집중해요'],
];
export const phrases = (type: number) => PHRASES.map((p, axis) => p[(type >> (3 - axis)) & 1]) as [string, string, string, string];

/** 응답이 가장 비슷한 사람 (유클리드 거리, 같으면 번호가 작은 사람) */
export function recommend(me: { id: string; answers: number[] }, others: { id: string; number: number; answers: number[] }[]) {
  const m = normalize(me.answers);
  let best: { id: string; d: number; n: number } | null = null;
  for (const o of others) {
    if (o.id === me.id) continue;
    const d = normalize(o.answers).reduce((s, v, i) => s + (v - m[i]) ** 2, 0);
    if (!best || d < best.d || (d === best.d && o.number < best.n)) best = { id: o.id, d, n: o.number };
  }
  return best?.id ?? null;
}
