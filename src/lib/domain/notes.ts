// 롤링페이퍼 규칙 (계획서 Task 4)
export const NOTE_MAX = 100; // 7명의 쪽지가 한 장에 들어가도록

/** 쓰는 사람이 고르는 손글씨 글꼴 [CSS 이름, 화면 이름]. 첫 번째가 기본. */
export const PAPER_FONTS = [
  ['Nanum Pen Script', '나눔펜'], ['Gaegu', '개구'], ['Gamja Flower', '감자꽃'], ['Hi Melody', '하이멜로디'], ['Poor Story', '푸어스토리'],
] as const;
export const paperFont = (f: unknown) => (PAPER_FONTS.some(([x]) => x === f) ? (f as string) : PAPER_FONTS[0][0]);

/** 전화번호·SNS 아이디처럼 보이는 내용은 막는다 */
export function containsContact(text: string) {
  if (/01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/.test(text)) return true;
  if (/\d{7,}/.test(text.replace(/[\s-]/g, ''))) return true;
  if (/카톡|카카오|kakao|open\.kakao|인스타|insta|instagram|텔레그램|telegram|라인\s?id|line\s?id/i.test(text)) return true;
  return /@[a-z0-9_.]{3,}/i.test(text);
}

const INKS = ['#7a2638', '#24345e', '#5b3a24', '#4b2a63'];
const seed = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (a: number) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * 한 장의 편지지 위에 쪽지를 흩어 놓되 서로 겹치지 않게: 쪽지는 차례로 흐르고(짧으면 두 개가 한 줄),
 * 각자 살짝 기울고 좌우로 비켜 앉는다. 같은 입력이면 항상 같은 결과.
 */
export function layoutNotes(notes: { id: string; body: string }[]) {
  const r = rng(seed(notes.map((n) => n.id).join('|')));
  return notes.map((n) => {
    const half = n.body.length <= 24; // 짧은 쪽지는 반 칸
    return {
      id: n.id,
      half,
      rotDeg: Math.round((r() * 6 - 3) * 10) / 10,
      shiftPct: half ? 0 : Math.round(r() * 14), // 긴 쪽지는 왼쪽 여백을 조금씩 다르게
      sizePx: Math.round(30 + r() * 4),
      ink: INKS[Math.floor(r() * INKS.length)],
    };
  });
}

/** 손글씨 글꼴 CSS (폰 기준 약 340KB): 롤링페이퍼를 쓰거나 볼 때만 불러온다 */
export const PAPER_FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Nanum+Pen+Script&family=Gaegu:wght@400;700&family=Gamja+Flower&family=Hi+Melody&family=Poor+Story&display=swap';
