/** 모임 뒤 진행자가 업무용 폰으로 보낼 문자 문구 (진행자 화면의 '복사' 버튼) */
type Who = { label: string; name: string; phone: string };

export function matchSms(name: string, partners: Who[]) {
  const head = partners.length > 1 ? `서로 마음이 닿은 분이 ${partners.length}분 있어요 💌` : '서로 마음이 닿은 분이 있어요 💌';
  return [
    `[플러팅 라운지] ${name}님, 오늘 와주셔서 고마워요.`,
    head, '',
    ...partners.map((p) => `${p.label} ${p.name}님 · ${p.phone}`), '',
    '오늘 대화 이어서 먼저 가볍게 인사 건네보세요.',
    '좋은 인연 되길 응원할게요 🙂',
    '– 옷깃 드림',
  ].join('\n');
}

export const noMatchSms = (name: string) => [
  `[플러팅 라운지] ${name}님, 오늘 함께해주셔서 고마워요.`,
  '이번엔 서로 마음이 닿은 분이 없었지만, 좋은 대화 나눠주셔서 정말 즐거웠어요.',
  '12월 18일 연말 와인 모임에서 또 만나요 🍷',
  '– 옷깃 드림',
].join('\n');
