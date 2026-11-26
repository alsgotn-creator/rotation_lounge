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

/** 한국 나이 → 출생연도 (올해 29살이면 올해-28). 모임 나이대도 한국 나이 기준으로 정한다 */
export const birthFromKoreanAge = (age: number, year: number) => year - age + 1;

/** 광화문연가 신청서 → applications 칸. 마이그레이션을 아직 안 돌렸으면 없는 칸의 값을 있는 칸 뒤에 붙인다.
 *  level 0: ideal·source·mbti·host_message 칸 모두 있음 (0019+0020+0021)
 *  level 1: 0021 전 → MBTI 는 job 뒤, 호스트에게 할 말은 ideal 뒤에 붙임
 *  level 2: 0020 전 → 위 + 경로를 job 뒤에 붙임
 *  level 3: 0019 전 → 이상형·호스트에게 할 말·MBTI·경로를 모두 job 에 함께 적음 */
export type GwForm = { job: string; ideal: string; mbti: string; message: string; source: string };
export function gwApplyRow(f: GwForm, level: 0 | 1 | 2 | 3) {
  const { job, ideal, mbti, message, source } = f;
  if (level === 0) return { job, ideal, source, mbti, host_message: message };
  const jobM = mbti ? `${job} · MBTI: ${mbti}` : job;
  const idealM = message ? `${ideal} · 호스트에게: ${message}` : ideal;
  if (level === 1) return { job: jobM, ideal: idealM, source };
  if (level === 2) return { job: `${jobM} · 경로: ${source}`, ideal: idealM };
  return { job: `${jobM} · 이상형: ${idealM} · 경로: ${source}` };
}

/** MBTI: 비워도 되고, 적었다면 4글자 유형(ENFP 등)이어야 한다. 대문자로 돌려주고 틀리면 null */
export function parseMbti(v: string): string | null {
  const t = v.trim().toUpperCase();
  return !t || /^[EI][NS][TF][JP]$/.test(t) ? t : null;
}

/** 신청 경로: ?from=insta 이거나 인스타 앱 안 브라우저면 인스타, 아니면 QR(카페 팻말) */
export const gwSource = (from: string | null, userAgent: string) => (from === 'insta' || /Instagram/i.test(userAgent) ? '인스타' : 'QR');

/** "1234, 5678" 처럼 적은 휴대폰 뒷번호 4자리들 (최대 5개). 칸에 뭔가 적었는데 4자리가 하나도 없으면 null */
export function parseTails(v: string): string[] | null {
  const t = v.trim();
  if (!t) return [];
  const found = t.match(/\d{4}/g);
  return found ? [...new Set(found)].slice(0, 5) : null;
}

/** 호스트가 적은 참가비(원). 비우면 기본값, 0~100만 원의 정수가 아니면 null(거절) */
export function parsePrice(v: unknown, fallback: number): number | null {
  const s = String(v ?? '').replace(/[,\s원]/g, '');
  if (!s) return fallback;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= 1_000_000 ? n : null;
}

/** /gwanghwamun 랜딩이 보여줄 모임: 장소에 광화문·을지로가 들어간 라운지 (4명이서 20분씩이라 더블 라운지도 포함) */
export const isGwanghwamun = (e: Pick<EventRow, 'venue'>) => /광화문|을지로/.test(e.venue);

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
export function avoidHits(me: { id: string; avoid: { name: string }[] }, others: { id: string; name: string; status: AppStatus; phone?: string }[]) {
  const wanted = new Set(me.avoid.map((a) => norm(a.name)));
  // 광화문연가 신청서는 이름 대신 "뒷번호 1234" 로 적는다 → 상대 휴대폰 끝 4자리와 비교 (번호가 저장된 사람만)
  const tails = new Set(me.avoid.map((a) => /^뒷번호 (\d{4})$/.exec(a.name)?.[1]).filter(Boolean));
  const tailOf = (p?: string) => (p ?? '').replace(/\D/g, '').slice(-4);
  return others.filter((o) => o.id !== me.id && o.status !== 'cancelled' && (wanted.has(norm(o.name)) || (tailOf(o.phone).length === 4 && tails.has(tailOf(o.phone)))));
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
