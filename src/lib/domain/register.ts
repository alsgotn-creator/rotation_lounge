/** 캐릭터(펜 선 일러스트). shape 칸에 캐릭터 id를 저장한다. 포인트 소품 색이 연애 컬러. */
export const CHARS = { f: ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'], m: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'] } as const;
export const SHAPES = [...CHARS.f, ...CHARS.m] as const;
export type Shape = (typeof SHAPES)[number];

export type RegistrationInput = {
  nickname: string; area: string; mbti: string; keywords: string[]; answers: number[];
  shape: string; consent: boolean;
};

/** 사전 등록 입력 검사. 문제가 없으면 null, 있으면 사용자에게 보여줄 문장 */
export function registrationError(r: RegistrationInput): string | null {
  const nick = r.nickname?.trim() ?? '';
  if (nick.length < 1 || nick.length > 12) return '닉네임은 1~12자로 적어주세요.';
  if (!r.area?.trim() || r.area.trim().length > 20) return '사는 곳을 적어주세요.';
  if (!/^[EI][NS][FT][JP]$/i.test(r.mbti ?? '')) return 'MBTI를 골라주세요.';
  const kw = (r.keywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (kw.length < 1 || kw.length > 2 || kw.some((k) => k.length > 15)) return '키워드는 1~2개, 15자 이내로 적어주세요.';
  if (!Array.isArray(r.answers) || r.answers.length !== 15 || r.answers.some((a) => !Number.isInteger(a) || a < 1 || a > 5)) return '질문 15개에 모두 답해주세요.';
  if (!SHAPES.includes(r.shape as Shape)) return '캐릭터를 골라주세요.';
  if (r.consent !== true) return '개인정보 수집에 동의해주세요.';
  return null;
}
