// 신청 규칙 (순수 함수 — 서버와 테스트에서 같이 쓴다)
export type Gender = 'f' | 'm';
export type AppStatus = 'new' | 'held' | 'awaiting_payment' | 'confirmed' | 'cancelled';
export type EventRow = {
  id: string; slug: string; title: string; starts_at: string; venue: string;
  birth_from: number; birth_to: number; capacity_per_gender: number;
  apply_open: boolean; price: number; payment_due_days: number;
};
export type Session = {
  id: string; mon: string; day: string; dow: string; dateLabel: string;
  time: string; place: string; birthFrom: number; birthTo: number;
  seatsF: number; seatsM: number; closed?: boolean;
};

/** 자리를 차지하는 상태: 입금 대기 + 확정. 새 신청은 자리를 잡지 않는다. */
export const HOLDS_SEAT: AppStatus[] = ['awaiting_payment', 'confirmed'];

export function seatsLeft(capacity: number, apps: { gender: Gender; status: AppStatus }[], g: Gender) {
  return Math.max(0, capacity - apps.filter((a) => a.gender === g && HOLDS_SEAT.includes(a.status)).length);
}

const KST = 'Asia/Seoul';
const part = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ko-KR', { timeZone: KST, ...o }).format(d);
const partEn = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: KST, ...o }).format(d).toUpperCase();

export function toSession(e: EventRow, apps: { gender: Gender; status: AppStatus }[], now = new Date()): Session {
  const d = new Date(e.starts_at);
  const seatsF = seatsLeft(e.capacity_per_gender, apps, 'f');
  const seatsM = seatsLeft(e.capacity_per_gender, apps, 'm');
  const time = part(d, { hour: 'numeric', minute: '2-digit', hour12: true }).replace('AM', '오전').replace('PM', '오후');
  return {
    id: e.id,
    mon: partEn(d, { month: 'short' }),
    day: part(d, { day: '2-digit' }).replace(/\D/g, ''),
    dow: partEn(d, { weekday: 'short' }),
    dateLabel: `${part(d, { month: 'long', day: 'numeric' })}(${part(d, { weekday: 'short' })})`,
    time,
    place: e.venue,
    birthFrom: e.birth_from, birthTo: e.birth_to, seatsF, seatsM,
    closed: !e.apply_open || d <= now || (seatsF === 0 && seatsM === 0),
  };
}

/** 입금 기한: 오늘 + N일, 단 행사 전날을 넘지 않는다. YYYY-MM-DD (KST) */
export function paymentDue(now: Date, startsAt: string, days: number) {
  const day = 86400000;
  const due = Math.min(now.getTime() + days * day, new Date(startsAt).getTime() - day);
  return new Intl.DateTimeFormat('en-CA', { timeZone: KST }).format(new Date(Math.max(due, now.getTime())));
}

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

/** 이 신청자가 적은 '피하고 싶은 지인' 중, 같은 행사의 다른 신청자와 이름이 같은 사람 */
export function avoidHits(me: { id: string; avoid: { name: string }[] }, others: { id: string; name: string; status: AppStatus }[]) {
  const wanted = new Set(me.avoid.map((a) => norm(a.name)));
  return others.filter((o) => o.id !== me.id && o.status !== 'cancelled' && wanted.has(norm(o.name)));
}
