export const digits = (s: string) => s.replace(/\D/g, '');

/** 01012345678 → 010-1234-5678 (입력 중에도 자연스럽게 하이픈을 넣는다) */
export function formatPhone(raw: string) {
  const d = digits(raw).slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export const isPhone = (s: string) => /^01[016789]\d{7,8}$/.test(digits(s));
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const isName = (s: string) => s.trim().length >= 2;

export function birthError(y: string, from: number, to: number): string | null {
  if (!/^\d{4}$/.test(y)) return null; // 아직 입력 중
  const n = Number(y);
  if (n < from || n > to) return `이 일정은 ${String(from).slice(2)}~${String(to).slice(2)}년생만 신청할 수 있어요`;
  return null;
}
export const isBirth = (y: string, from: number, to: number) => /^\d{4}$/.test(y) && !birthError(y, from, to);
