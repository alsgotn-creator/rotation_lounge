// 인쇄물(밸런스게임 vol.1·2, 연애 토크 카드)의 카드 원문. "너는? 꼭 되물어주기" 안내는 넣지 않는다.
export type CardKind = 'balance' | 'talk' | 'scenario';
export type GameCard = { id: string; kind: CardKind; prompt: string; options: [string, string] | null; hint?: string };

const b = (id: string, prompt: string, a: string, c: string): GameCard => ({ id, kind: 'balance', prompt, options: [a, c] });
const t = (id: string, prompt: string, hint?: string): GameCard => ({ id, kind: 'talk', prompt, options: null, hint });
const s = (id: string, prompt: string): GameCard => ({ id, kind: 'scenario', prompt, options: null });

export const KINDS: { kind: CardKind; label: string; sub: string }[] = [
  { kind: 'balance', label: '밸런스 게임', sub: '둘 중 하나만 고른다면?' },
  { kind: 'talk', label: '연애 토크', sub: '정답 없는 가치관 이야기' },
  { kind: 'scenario', label: '시나리오', sub: '이 상황, 나라면?' },
];

export const CARDS: GameCard[] = [
  b('b1', '데이트 중 딱! 하나만 해야 한다면?', '템플 스테이', '호화 호캉스'),
  b('b2', '연애용 애인과 결혼용 애인이 따로 있다고 생각해?', '따로 있다', '같은 사람이다'),
  b('b3', '둘 중 하나는 용서할 수 있다면?', '정신적 바람', '신체적 바람'),
  b('b4', '내가 생각하는 결혼 생활은?', '의리가 느껴지는 결혼 생활', '없으면 못 사는 결혼 생활'),
  b('b5', '상대가 원하면 결혼식도 생략할 수 있다?', '생략할 수 있다', '절대 안 된다'),
  b('b6', '애인의 과거, 나는?', '신경 쓴다', '신경 안 쓴다'),
  b('b7', '둘 중 하나만 고른다면?', '하루 종일 연락 두절인 애인', '5분마다 "어디야?" 묻는 CCTV 애인'),
  b('b8', '둘 중 하나만 고른다면?', '1년에 한 번 보는 10년지기 이성친구 2명', '가끔 안부 묻는 이성친구 5명'),
  b('b9', '둘 중 하나만 고른다면?', '계산할 때마다 눈치 보며 느려지는 애인', '데이트 통장 1,000원 단위까지 나누는 애인'),
  b('b10', '둘 중 하나만 고른다면?', '1년에 한 번 뽀뽀하는 애인', '하루에 3번 키스하는 애인'),
  b('b11', '둘 중 하나만 고른다면?', '알아갈수록 좋아지는 스타일', '첫인상에 결정 나는 스타일'),
  b('b12', '사귄 지 3일, 이상형의 고백!', '지금 애인과 끝까지', '이상형에게 간다'),
  b('b13', '1주년을 까먹은 애인에게', '말 안 하고 기다린다', '바로 서운하다고 말한다'),
  t('t1', '애인이 절대 하지 않았으면 하는 행동은?'),
  t('t2', '무조건 2개를 포기해야 한다면?', 'MBTI · 키 · 얼굴 · 성격 · 능력 · 자산 · 끌림'),
  t('t3', '애인의 이성친구, 어디까지 허용 가능?', '① 단체 모임 ② 단둘이 밥 ③ 단둘이 술 ④ 연락도 싫다'),
  t('t4', '일주일에 데이트는 몇 번이 적당해?', '1번 · 2~3번 · 거의 매일'),
  t('t5', '애인과 하루 종일 할 수 있는 스킨십은?'),
  t('t6', '얼굴 포함, 가장 자신 있는 신체 부위는?'),
  t('t7', '오늘 여기서 끝사랑을 찾았다면, 나는 ______ 하겠다.'),
  t('t8', '연애·결혼 가치관에서 어렸을 때와 달라진 점이 있다면?'),
  t('t9', '우리가 연애를 안 하고 있는 이유가 뭘까?'),
  t('t10', '그나마 사귈 수 있는 사람은?', '모쏠 · 15년 연애한 사람 · 1년에 6번 연애한 사람'),
  t('t11', '내 연애 스타일은?'),
  s('s1', '약속에 30분 늦은 애인이 "방금 일어났어"라고 한다. 나는?'),
  s('s2', '애인 폰에 이성의 "오늘 즐거웠어요" 메시지가 떴다. 나는?'),
  s('s3', '헤어진 전 애인이 "잘 지내?"라고 연락해 왔다. 나는?'),
  s('s4', '내 생일에 애인이 친구와의 약속을 먼저 잡았다. 나는?'),
];

export const cardById = (id: string) => CARDS.find((c) => c.id === id) ?? null;
export const ANSWER_MAX = 100;

/** 현재 카드와 다른 카드를 종류 안에서 무작위로 */
export function drawCard(kind: CardKind, currentId?: string | null, rnd = Math.random): GameCard {
  const pool = CARDS.filter((c) => c.kind === kind && c.id !== currentId);
  return pool[Math.floor(rnd() * pool.length)];
}
