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
  seatsF: number; seatsM: number; closed?: boolean; double?: boolean;
};

/** 광화문연가 신청서 → applications 칸. hasColumns=false(0019 마이그레이션 전)면 이상형·근무 여부를 job 칸에 함께 적는다 */
export function gwApplyRow(job: string, ideal: string, near: string, hasColumns: boolean) {
  const nearKo = near === 'yes' ? '광화문 근처 근무' : '광화문 근처 근무 아님';
  return hasColumns ? { job, ideal, near_work: nearKo } : { job: `${job} · 이상형: ${ideal} · ${nearKo}` };
}

/** 호스트가 적은 참가비(원). 비우면 기본값, 0~100만 원의 정수가 아니면 null(거절) */
export function parsePrice(v: unknown, fallback: number): number | null {
  const s = String(v ?? '').replace(/[,\s원]/g, '');
  if (!s) return fallback;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : null;
}

/** /gwanghwamun 랜딩이 보여줄 모임: 장소에 광화문·을지로가 들어간 일반(더블 아닌) 라운지 */
export const isGwanghwamun = (e: Pick<EventRow, 'venue' | 'title'>) => /광화문|을지로/.test(e.venue) && !e.title.includes('더블');

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
    double: e.title.includes('더블'), // 더블 라운지 일정은 제목이 '플러팅 더블 라운지'
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

/** 비어 있는 호 번호 중 하나를 무작위로 (1..capacity). 다 찼으면 null */
export function pickNumber(taken: number[], capacity: number, rand = Math.random) {
  const free = Array.from({ length: capacity }, (_, i) => i + 1).filter((n) => !taken.includes(n));
  return free.length ? free[Math.floor(rand() * free.length)] : null;
}

/**
 * 빈 번호 없이 1..k로 당기기 (k = 사람 수). 이미 1..k 안에 있는 사람은 그대로 두고,
 * 바깥 번호인 사람만 빈 번호로 옮긴다 → 알려야 할 사람이 가장 적다. 반환: 바뀌는 사람만 [id, 새 번호]
 */
export function compactNumbers(people: { id: string; number: number }[]): [string, number][] {
  const k = people.length;
  const keep = new Set(people.filter((p) => p.number <= k).map((p) => p.number));
  const gaps = Array.from({ length: k }, (_, i) => i + 1).filter((n) => !keep.has(n));
  const movers = people.filter((p) => p.number > k).sort((a, b) => a.number - b.number);
  return movers.map((p, i) => [p.id, gaps[i]]);
}
