import 'server-only';
import { db } from './supabase';
import { loadRun, type Person } from './run';
import { partnersOf, ordinal, type Round } from '../domain/seating';
import { metIds, pendingNotes, type Pending } from '../domain/turns';
import { phrases, recommend } from '../domain/loveType';
import { mutualMatches } from '../domain/matching';
import type { PublicCard } from '../domain/lounge';

export type Profile = { age: number; job: string; area: string; mbti: string; color: number; phrases: string[] };
export type PlayView = {
  serverNow: number;
  phase: 'before' | 'talk' | 'choice' | 'closing';
  noNumber: boolean;                       // 아직 호 번호가 없다 (호스트에게 문의)
  round: null | { no: number; total: number; timer: Round; perTable: number; partners: PublicCard[]; ordinal: number; oppositeCount: number };
  met: Record<string, Profile>;            // 7분 이상 함께 앉았던 사람만. 한 번 공개되면 계속 보인다.
  pending: null | { round: number; to: PublicCard };
  recommendation: null | 'pending' | PublicCard;   // 호스트가 '추천 공개'를 누르면 가장 비슷한 이성
  choice: null | { max: number; picks: string[]; done: boolean; candidates: PublicCard[] };
  paper: null | { notes: { id: string; body: string }[] };   // 마무리 단계에서 내가 받은 쪽지 (쓴 사람은 없다)
  resultsOpen: boolean;
  result: null | { matches: PublicCard[] };                  // 서로 고른 사람만. 나를 고른 사람 수·이름은 어디에도 없다.
};

const card = (p: Person): PublicCard => ({ id: p.id, gender: p.gender, number: p.number, shape: p.shape, prop: p.prop, color: p.color, keywords: p.keywords, me: false });

/** 참가자 한 명 기준의 상태. 다른 사람의 비공개 정보는 7분 규칙(metIds)을 통과한 사람만 담는다. */
export async function computePlay(eventId: string, meId: string, now = Date.now()) {
  const run = await loadRun(eventId);
  const { ev, rounds, current, people, seated } = run;
  const T = ev.table_count, g = ev.per_table;
  const byId = new Map(people.map((p) => [p.id, p]));
  const me = seated.find((s) => s.id === meId) ?? null;
  const opposite = people.filter((p) => p.gender !== byId.get(meId)?.gender && p.number != null && !p.excluded);

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

  // 가장 비슷한 이성 (호스트가 열었을 때만)
  let recommendation: PlayView['recommendation'] = null;
  if (me) {
    recommendation = 'pending';
    if (ev.recommendation_open) {
      const { data } = await db().from('participants').select('id,number,answers').in('id', [meId, ...opposite.map((p) => p.id)]);
      const mine = (data ?? []).find((r) => r.id === meId);
      const best = mine && recommend({ id: meId, answers: mine.answers }, (data ?? []).filter((r) => r.id !== meId).map((r) => ({ id: r.id, number: r.number ?? 99, answers: r.answers })));
      recommendation = best && byId.get(best) ? card(byId.get(best)!) : 'pending';
    }
  }

  // 최종 선택
  let choice: PlayView['choice'] = null;
  if (me && ev.phase === 'choice') {
    const { data } = await db().from('choices').select('to_id').eq('event_id', eventId).eq('from_id', meId);
    const picks = (data ?? []).map((c) => c.to_id as string);
    const d = await db().from('participants').select('choice_done_at').eq('id', meId).single();
    choice = { max: ev.max_picks, picks, done: !d.error ? !!d.data?.choice_done_at : picks.length > 0, candidates: opposite.sort((a, b) => a.number! - b.number!).map(card) };
  }

  // 마무리: 받은 쪽지 + (호스트가 열면) 매칭 결과
  let paper: PlayView['paper'] = null, result: PlayView['result'] = null;
  if (me && ev.phase === 'closing') {
    const { data } = await db().from('notes').select('id,body').eq('event_id', eventId).eq('to_id', meId).eq('hidden', false).not('body', 'is', null).order('created_at');
    paper = { notes: (data ?? []).map((n) => ({ id: n.id as string, body: n.body as string })) };
    if (ev.results_open) {
      const { data: all } = await db().from('choices').select('from_id,to_id').eq('event_id', eventId);
      const ms = mutualMatches((all ?? []).map((c) => ({ fromId: c.from_id as string, toId: c.to_id as string })), meId);
      result = { matches: ms.map((id) => byId.get(id)).filter((p): p is Person => !!p).map(card) };
    }
  }

  const view: PlayView = {
    serverNow: now, phase: ev.phase, noNumber: !me, round, met, recommendation, choice, paper, result, resultsOpen: !!ev.results_open,
    pending: first && byId.get(first.toId) ? { round: first.round, to: card(byId.get(first.toId)!) } : null,
  };
  return { view, pendingAll, opposite };
}
