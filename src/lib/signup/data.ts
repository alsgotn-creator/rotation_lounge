// 미리보기용 예시 데이터. 실제 일정·자리는 나중에 Supabase에서 읽어온다.
export type Session = {
  id: string; mon: string; day: string; dow: string; dateLabel: string;
  time: string; place: string; birthFrom: number; birthTo: number;
  seatsF: number; seatsM: number; closed?: boolean;
};

export const SESSIONS: Session[] = [
  { id: '1115', mon: 'NOV', day: '15', dow: 'SAT', dateLabel: '11월 15일(토)', time: '오후 7:30', place: '성수', birthFrom: 1994, birthTo: 1999, seatsF: 1, seatsM: 3 },
  { id: '1122', mon: 'NOV', day: '22', dow: 'SAT', dateLabel: '11월 22일(토)', time: '오후 7:30', place: '성수', birthFrom: 1990, birthTo: 1995, seatsF: 4, seatsM: 2 },
  { id: '1108', mon: 'NOV', day: '08', dow: 'SAT', dateLabel: '11월 8일(토)', time: '오후 7:30', place: '성수', birthFrom: 1994, birthTo: 1999, seatsF: 0, seatsM: 0, closed: true },
];

export const PRICE = 30000;
export const ACCOUNT = { bank: '토스뱅크', number: '1000-4168-0942', holder: '민시훈' };

export const won = (n: number) => n.toLocaleString('ko-KR') + '원';
export const yy = (y: number) => String(y).slice(2);
