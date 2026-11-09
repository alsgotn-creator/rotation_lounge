import type { EventRow } from './rules';

// Supabase 키가 없을 때(로컬 미리보기) 보여줄 예시 일정
export const SAMPLE_EVENTS: EventRow[] = [
  { id: 'sample-1114', slug: 'sample-1114', title: '플러팅 라운지', starts_at: '2026-11-14T10:30:00Z', venue: '성수', birth_from: 1994, birth_to: 1999, capacity_per_gender: 7, apply_open: true, price: 30000, payment_due_days: 3 },
  { id: 'sample-1121', slug: 'sample-1121', title: '플러팅 라운지', starts_at: '2026-11-21T10:30:00Z', venue: '성수', birth_from: 1990, birth_to: 1995, capacity_per_gender: 7, apply_open: true, price: 30000, payment_due_days: 3 },
];

export const PRICE = 30000;
// 계좌는 잠시 비워둠(공개 안 함). 다시 보여주려면 토스뱅크 1000-4168-0942 민시훈을 채울 것
export const ACCOUNT = { bank: '', number: '', holder: '' };
export const HOST_NAME = '옷깃';
export const BUSINESS = { owner: '민시훈', number: '697-67-00622', email: 'alsgotn@naver.com' };

export const won = (n: number) => n.toLocaleString('ko-KR') + '원';
export const yy = (y: number) => String(y).slice(2);
