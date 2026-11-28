/** 광화문연가 랜딩 설정. 날짜·가격·안내 표는 여기 한곳에서만 고친다 (날짜는 모두 한국 시간) */
export const EARLY_END = '2026-12-08T23:59:59+09:00'; // 이때까지 얼리버드 가격
export const APPLY_END = '2026-12-10T10:00:00+09:00'; // 이때부터 신청 마감
export const PRICE_EARLY = 39000;
export const PRICE_REGULAR = 42000;

/** 모임 안내 표. 참가비 칸의 값은 가격 로직이 대신 그린다. '['로 시작하는 값은 '아직 미정' 모양으로 보인다 */
export const INFO: [string, string][] = [
  ['일시', '2026년 12월 11일(금) 오후 7시'],
  ['장소', '광화문 인근 카페 (참가하시는 분들께 따로 안내)'],
  ['대상', '92~02년생 광화문·을지로 직장인 · 호스트가 한 분씩 확인해 수락'],
  ['인원', '10 : 10 (최대 20명)'],
  ['참가비', ''],
  ['신청 마감', '12월 10일(목) 오전 10시'],
];

const DAY = 86_400_000;
const kstDay = (ms: number) => Math.floor((ms + 9 * 3_600_000) / DAY); // 기기 시간대와 무관하게 한국 날짜로 센다

export type Phase = { phase: 'early' | 'regular' | 'closed'; price: number; dDay: number };
/** 지금 시각(ms)의 모집 단계. dDay: 얼리버드 마감일까지 남은 날 (마감 당일 0) */
export function gwPhase(now: number): Phase {
  const dDay = kstDay(Date.parse(EARLY_END)) - kstDay(now);
  if (now >= Date.parse(APPLY_END)) return { phase: 'closed', price: PRICE_REGULAR, dDay };
  if (now > Date.parse(EARLY_END)) return { phase: 'regular', price: PRICE_REGULAR, dDay };
  return { phase: 'early', price: PRICE_EARLY, dDay };
}

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
export const dLabel = (d: number) => (d <= 0 ? 'D-DAY' : `D-${d}`);
