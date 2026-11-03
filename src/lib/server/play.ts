import 'server-only';
import { db } from './supabase';
import { loadRun, type Person } from './run';
import { partnersOf, ordinal, type Round } from '../domain/seating';
import { metIds, pendingNotes, type Pending } from '../domain/turns';
import { phrases } from '../domain/loveType';
import type { PublicCard } from '../domain/lounge';

export type Profile = { age: number; job: string; area: string; mbti: string; color: number; phrases: string[] };
export type PlayView = {
  serverNow: number;
  phase: 'before' | 'talk' | 'choice' | 'closing';
  noNumber: boolean;                       // 아직 호 번호가 없다 (호스트에게 문의)
  round: null | { no: number; total: number; timer: Round; perTable: number; partners: PublicCard[]; ordinal: number; oppositeCount: number };
  met: Record<string, Profile>;            // 7분 이상 함께 앉았던 사람만. 한 번 공개되면 계속 보인다.
  pending: null | { round: number; to: PublicCard };
};

const card = (p: Person): PublicCard => ({ id: p.id, gender: p.gender, number: p.number, shape: p.shape, prop: p.prop, color: p.color, keywords: p.keywords, me: false });

/** 참가자 한 명 기준의 라운드 상태. 다른 사람의 비공개 정보는 7분 규칙(metIds)을 통과한 사람만 담는다. */
export async function computePlay(eventId: string, meId: string, now = Date.now()) {
  const run = await loadRun(eventId);
  const { ev, rounds, current, people, seated } = run;
  const T = ev.table_count, g = ev.per_table;
  const byId = new Map(people.map((p) => [p.id, p]));
  const me = seated.find((s) => s.id === meId) ?? null;

  let round: PlayView['round'] = null;
  if (me && ev.phase === 'talk' && current && !current.closedAt) {
    round = {
      no: current.no, total: T, timer: current, perTable: g,
      partners: partnersOf(me, current.no, T, seated, g).sort((a, b) => a.number - b.number).map((s) => card(byId.get(s.id)!)),
      ordinal: ordinal(me, current.no, T, seated, g),
      oppositeCount: seated.filter((s) => s.gender !== me.gender).length,
    };
  }

  const met: PlayView['met'] = {};
  const ids = me ? metIds(me, rounds, T, g, seated, now) : [];
  if (ids.length) {
    const { data } = await db().from('participants').select('id,age,job,area,mbti,love_type').in('id', ids);
    for (const r of data ?? []) met[r.id as string] = { age: r.age, job: r.job, area: r.area, mbti: r.mbti, color: r.love_type, phrases: phrases(r.love_type) };
  }

  // 롤링페이퍼 밀린 것. notes 표가 아직 없으면(마이그레이션 전) 건너뛴다.
  let pendingAll: Pending[] = [];
  if (me) {
    const { data, error } = await db().from('notes').select('round,to_id').eq('event_id', eventId).eq('from_id', meId);
    if (!error) pendingAll = pendingNotes(me, rounds, T, g, seated, new Set((data ?? []).map((n) => `${n.round}:${n.to_id}`)), now, ev.phase);
  }
  const first = pendingAll[0];
  const view: PlayView = {
    serverNow: now, phase: ev.phase, noNumber: !me, round, met,
    pending: first && byId.get(first.toId) ? { round: first.round, to: card(byId.get(first.toId)!) } : null,
  };
  return { view, pendingAll };
}
