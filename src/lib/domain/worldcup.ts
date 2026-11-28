// 이상형 월드컵 (광화문연가 사전 등록 마지막 단계). 이성 후보 16명 중 하나를 고를 때까지 둘씩 붙인다.
// 사진은 public/gwanghwamun/wc/<id>.jpg (AI로 만든 가상 인물이라 실존 인물이 아니다)

export type WcCard = { id: string; line: string };

/** 여자 후보는 남자 참가자에게, 남자 후보는 여자 참가자에게 보인다 */
export const WC: Record<'f' | 'm', WcCard[]> = {
  f: [
    ['f01', '눈웃음이 귀여운 앞머리 단발'], ['f02', '웃음소리가 시원한 포니테일'], ['f03', '안경 쓴 털털한 집게핀'], ['f04', '차분하게 웃는 웨이브 펌'],
    ['f05', '보조개가 깊은 숏컷'], ['f06', '조용히 웃는 긴 생머리'], ['f07', '한강 러닝 좋아하는 곱슬머리'], ['f08', '사원증이 잘 어울리는 하이포니'],
    ['f09', '금테 안경의 다정한 책방 단골'], ['f10', '레코드숍 가는 레이어드컷'], ['f11', '장난기 많은 일자 앞머리'], ['f12', '똑 부러지는 턱선 단발'],
    ['f13', '크리스마스 마켓이 좋은 반묶음'], ['f14', '요리가 취미인 긴 웨이브'], ['f15', '전시 보러 다니는 로우번'], ['f16', '눈 오는 날 제일 신나는 사람'],
  ].map(([id, line]) => ({ id, line })),
  m: [
    ['m01', '듬직하게 웃는 반삭'], ['m02', '성실한 안경 직장인'], ['m03', '캠핑 좋아하는 곱슬 펌'], ['m04', '단정한 투블럭 니트'],
    ['m05', '비니 쓴 다정한 안경'], ['m06', '아침마다 뛰는 러너'], ['m07', '도자기 빚는 반묶음 머리'], ['m08', '넥타이 없는 정장 직장인'],
    ['m09', '야시장 좋아하는 보조개'], ['m10', '노을 보러 가는 코트 차림'], ['m11', '책방에서 만날 것 같은 가디건'], ['m12', '야구장 가면 신나는 사람'],
    ['m13', '뿔테 안경의 차분한 공부파'], ['m14', '앞치마 두르고 요리하는 사람'], ['m15', '미술관 가는 터틀넥'], ['m16', '주말엔 산에 가는 사람'],
  ].map(([id, line]) => ({ id, line })),
};

export const wcImg = (id: string) => `/gwanghwamun/wc/${id}.jpg`;
export const wcCard = (id: string) => [...WC.f, ...WC.m].find((c) => c.id === id) ?? null;

/** 16강 · 8강 · 4강 · 결승 */
export const roundName = (left: number) => (left <= 2 ? '결승' : `${left}강`);

export function shuffle<T>(a: T[], rand: () => number = Math.random) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

/** 저장할 결과: 우승 id와 단계별로 떨어진 순서(마지막이 우승). 바깥에서 들어온 값이라 모양을 확인한다 */
export type WcResult = { winner: string; order: string[] };
export function wcResultError(r: unknown, pool: WcCard[]): string | null {
  const x = r as WcResult;
  const ids = new Set(pool.map((c) => c.id));
  if (!x || typeof x.winner !== 'string' || !Array.isArray(x.order)) return '결과를 다시 보내주세요.';
  if (x.order.length !== pool.length || new Set(x.order).size !== pool.length || x.order.some((id) => !ids.has(id))) return '결과를 다시 보내주세요.';
  if (x.order[x.order.length - 1] !== x.winner) return '결과를 다시 보내주세요.';
  return null;
}
