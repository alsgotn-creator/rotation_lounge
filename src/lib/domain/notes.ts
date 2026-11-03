// 롤링페이퍼 규칙 (계획서 Task 4)
export const NOTE_MAX = 200;

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

/** 한 장의 편지지 위에 흩어 놓을 위치·각도·크기·잉크색. 같은 입력이면 항상 같은 결과. */
export function layoutNotes(ids: string[]) {
  const n = ids.length, cols = Math.max(1, Math.ceil(Math.sqrt(n))), rows = Math.max(1, Math.ceil(n / cols));
  const r = rng(seed(ids.join('|')));
  const cw = 74 / cols, ch = 74 / rows, clamp = (v: number) => Math.min(80, Math.max(6, v));
  return ids.map((id, i) => ({
    id,
    xPct: clamp(6 + (i % cols + 0.5) * cw - cw * 0.35 + r() * cw * 0.7),
    yPct: clamp(6 + (Math.floor(i / cols) + 0.5) * ch - ch * 0.35 + r() * ch * 0.7),
    rotDeg: Math.round((r() * 18 - 9) * 10) / 10,
    sizePx: Math.round(17 + r() * 7),
    ink: INKS[Math.floor(r() * INKS.length)],
  }));
}
