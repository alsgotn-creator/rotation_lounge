// 연애 컬러 16유형 (계획서 Task 2, 스펙 §5)
export type Axis = 0 | 1 | 2 | 3; // 거리감 · 표현 · 데이트 · 미래

/** 한 줄에 들어가게 짧게 (테스트가 길이를 지킨다). axis null = 연애 컬러에는 안 들어가고 '가장 비슷한 사람' 추천에만 쓰인다. */
export const QUESTIONS: { text: string; axis: Axis | null; reversed: boolean }[] = [
  // 한 화면에 5개씩, 주제를 섞어서
  { text: '답장 늦으면 신경 쓰여요', axis: 0, reversed: false },
  { text: '스킨십은 빠를수록 좋아요', axis: 1, reversed: false },
  { text: '데이트는 집에서 넷플릭스', axis: 2, reversed: false },
  { text: '1년 만나면 결혼 얘기해요', axis: 3, reversed: false },
  { text: '외모, 솔직히 중요해요', axis: null, reversed: false },

  { text: '고백은 내가 먼저 하는 편', axis: 1, reversed: false },
  { text: '각자 약속 많아도 괜찮아요', axis: 0, reversed: true },
  { text: '맛집 웨이팅 2시간도 OK', axis: 2, reversed: true },
  { text: '결혼 안 해도 행복할 수 있어요', axis: 3, reversed: true },
  { text: '전 애인과 친구 가능해요', axis: null, reversed: false },

  { text: '내 폰, 애인이 봐도 돼요', axis: 0, reversed: false },
  { text: '즉흥 여행, 당장 떠나요', axis: 2, reversed: true },
  { text: '싸우면 하루쯤 시간 필요해요', axis: 1, reversed: true },
  { text: '연애에도 돈 계획이 필요해요', axis: 3, reversed: false },
  { text: '데이트 비용은 반반이 맞아요', axis: null, reversed: false },
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
/** 16유형 이름: (거리감·표현) 형용사 + (데이트·미래) 이름. 예) 다정한 둥지형 */
const ADJ = ['다정한', '포근한', '솔직한', '담백한'], NOUN = ['둥지형', '아지트형', '항해형', '모험형'];
export const typeName = (type: number) => `${ADJ[type >> 2]} ${NOUN[type & 3]}`;

export const phrases = (type: number) => PHRASES.map((p, axis) => p[(type >> (3 - axis)) & 1]) as [string, string, string, string];

/** 두 사람 응답이 얼마나 비슷한지 0~100%. 추천과 같은 거리(역문항 뒤집은 15문항의 유클리드 거리)를 최대 거리로 나눈다. */
export function similarity(a: number[], b: number[]) {
  const x = normalize(a), y = normalize(b);
  const d = Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0));
  return Math.round(100 * (1 - d / Math.sqrt(16 * x.length)));
}

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
