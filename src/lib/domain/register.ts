export const SHAPES = ['cloud', 'mochi', 'drop'] as const;
export const PROPS = ['none', 'ribbon', 'flower', 'star', 'heart', 'crown'] as const;
export type Shape = (typeof SHAPES)[number];
export type Prop = (typeof PROPS)[number];
export const SHAPE_KO: Record<Shape, string> = { cloud: '구름', mochi: '동글', drop: '물방울' };
export const PROP_KO: Record<Prop, string> = { none: '없음', ribbon: '리본', flower: '꽃', star: '별', heart: '하트', crown: '왕관' };

export type RegistrationInput = {
  nickname: string; area: string; mbti: string; keywords: string[]; answers: number[];
  shape: string; prop: string; consent: boolean;
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
  if (!SHAPES.includes(r.shape as Shape) || !PROPS.includes(r.prop as Prop)) return '캐릭터를 골라주세요.';
  if (r.consent !== true) return '개인정보 수집에 동의해주세요.';
  return null;
}
