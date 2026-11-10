import { ACCS, CHARS, EYEWEAR, type RegistrationInput } from './register';

/** 시연용 게스트 번호: 첫 화면 '라운지 입장'에 이 번호를 넣으면 시연 모임(demo-)의 빈 자리 중 하나로 들어간다 */
export const DEMO_PHONE = '010-0000-0000';

const NICKS = ['봄바람', '라떼한잔', '산책러', '고양이집사', '새벽러너', '책방지기', '여행중', '노을맛집', '주말캠퍼', '귤까는중'];
const AREAS = ['성수', '합정', '잠실', '연남', '판교', '을지로', '망원', '서촌'];
const KEYWORDS = ['캠핑', '러닝', '전시회', '맛집탐방', '보드게임', '요리', '독서', '여행', '영화', '필라테스', '드라이브', '와인'];

/** 사전 등록을 건너뛰도록 아무렇게나 채운 등록 정보 (registrationError 를 통과한다) */
export function randomGuest(gender: 'f' | 'm', rnd = Math.random): RegistrationInput {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const kw = pick(KEYWORDS);
  const other = pick(KEYWORDS.filter((k) => k !== kw));
  const accs = ACCS.filter(() => rnd() < 0.25);
  const eye = accs.find((a) => EYEWEAR.includes(a)); // 안경류는 하나만
  return {
    nickname: pick(NICKS), area: pick(AREAS),
    mbti: [pick(['E', 'I']), pick(['N', 'S']), pick(['F', 'T']), pick(['J', 'P'])].join(''),
    keywords: rnd() < 0.5 ? [kw] : [kw, other],
    answers: Array.from({ length: 15 }, () => 1 + Math.floor(rnd() * 5)),
    shape: pick(CHARS[gender]), prop: accs.filter((a) => !EYEWEAR.includes(a) || a === eye).join(','), consent: true,
  };
}
