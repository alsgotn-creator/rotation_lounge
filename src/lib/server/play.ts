import 'server-only';
import { db } from './supabase';
import { loadRun, type Person } from './run';
import { partnersOf, ordinal, tableOf, type Round } from '../domain/seating';
import { cardById } from '../domain/cards';
import { metIds, pendingNotes, type Pending } from '../domain/turns';
import { phrases, recommend } from '../domain/loveType';
import { mutualMatches } from '../domain/matching';
import { paperFont } from '../domain/notes';
import type { PublicCard } from '../domain/lounge';

export type Profile = { age: number; job: string; area: string; mbti: string; color: number; phrases: string[] };
export type PlayView = {
  serverNow: number;
  me: PublicCard | null;                   // 나 (라운드 장면 왼쪽). 상대와 같은 응답에서 와야 섞이지 않는다
  phase: 'before' | 'talk' | 'choice' | 'closing';
  noNumber: boolean;                       // 아직 호 번호가 없다 (호스트에게 문의)
  round: null | { no: number; total: number; timer: Round; perTable: number; partners: PublicCard[]; ordinal: number; oppositeCount: number };
  met: Record<string, Profile>;            // 5분 이상 함께 앉았던 사람만 (최종선택 때는 같이 앉았던 사람 모두). 한 번 공개되면 계속 보인다.
  pending: null | { round: number; to: PublicCard };
  recommendation: null | 'pending' | PublicCard;   // 호스트가 '추천 공개'를 누르면 가장 비슷한 이성
  choice: null | { max: number; picks: string[]; done: boolean; candidates: PublicCard[] };
  paper: null | { notes: { id: string; body: string; font: string; from: { gender: 'f' | 'm'; number: number | null } }[] };   // 최종선택 단계에만. 보낸 사람은 '여3호'처럼 호가 보인다
  resultsOpen: boolean;
  game: null | { cardId: string; kind: string; prompt: string; options: string[]; mine: string | null; answered: number; total: number; answers: null | { gender: 'f' | 'm'; number: number; me: boolean; text: string }[] };
  result: null | { matches: PublicCard[] };                  // 서로 고른 사람만. 나를 고른 사람 수·이름은 어디에도 없다.
};

const card = (p: Person): PublicCard => ({ id: p.id, gender: p.gender, number: p.number, shape: p.shape, prop: p.prop, color: p.color, keywords: p.keywords, me: false });

/** 참가자 한 명 기준의 상태. 다른 사람의 비공개 정보는 5분 규칙(metIds)을 통과한 사람만 담는다. */
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

  // 선택형 페어 게임: 이 테이블의 카드와 답. 테이블 사람이 모두 답해야 서로의 답이 보인다. 표가 없으면(마이그레이션 전) 건너뛴다.
  let game: PlayView['game'] = null;
  const table = me && round ? tableOf(me, round.no, T, g) : null;
  if (me && round && table && round.partners.length) {
    const key = { event_id: eventId, round: round.no, table_no: table };
    const { data: play, error } = await db().from('game_plays').select('card_id').match(key).maybeSingle();
    const c = !error && play ? cardById(play.card_id as string) : null;
    if (c) {
      const { data: ans } = await db().from('game_answers').select('participant_id,answer').match(key);
      const total = round.partners.length + 1, mine = (ans ?? []).find((a) => a.participant_id === meId)?.answer ?? null;
      const done = (ans ?? []).length >= total;
      game = {
        cardId: c.id, kind: c.kind, prompt: c.prompt, options: c.options, mine, answered: (ans ?? []).length, total,
        answers: done ? (ans ?? []).map((a) => { const p = byId.get(a.participant_id as string)!; return { gender: p.gender, number: p.number!, me: p.id === meId, text: a.answer as string }; }).sort((x, y) => Number(y.me) - Number(x.me) || x.number - y.number) : null,
      };
    }
  }

  const met: PlayView['met'] = {};
  const ids = me ? metIds(me, rounds, T, g, seated, now, ev.phase === 'choice') : [];
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
    let cq = await db().from('choices').select('to_id,rank').eq('event_id', eventId).eq('from_id', meId).order('rank');
    if (cq.error) cq = (await db().from('choices').select('to_id').eq('event_id', eventId).eq('from_id', meId)) as typeof cq; // rank 칸이 없을 때
    const picks = (cq.data ?? []).map((c) => c.to_id as string); // 순위 순서
    const d = await db().from('participants').select('choice_done_at').eq('id', meId).single();
    choice = { max: ev.max_picks, picks, done: !d.error ? !!d.data?.choice_done_at : picks.length > 0, candidates: opposite.sort((a, b) => a.number! - b.number!).map(card) };
  }

  // 받은 쪽지는 최종선택 단계에서 (고르기 전에) 읽는다. 마무리에서는 (호스트가 열면) 매칭 결과만.
  let paper: PlayView['paper'] = null, result: PlayView['result'] = null;
  if (me && ev.phase === 'choice') {
    const q = (cols: string) => db().from('notes').select(cols).eq('event_id', eventId).eq('to_id', meId).eq('hidden', false).not('body', 'is', null).order('created_at');
    let res = await q('id,body,from_id,font');
    if (res.error) res = await q('id,body,from_id'); // font 칸이 아직 없을 때
    const data = (res.data ?? []) as unknown as { id: string; body: string; from_id: string; font?: string | null }[];
    paper = { notes: data.map((n) => { const f = byId.get(n.from_id); return { id: n.id, body: n.body, font: paperFont(n.font), from: { gender: (f?.gender ?? 'f') as 'f' | 'm', number: f?.number ?? null } }; }) };
  }
  if (me && ev.phase === 'closing') {
    if (ev.results_open) {
      const { data: all } = await db().from('choices').select('from_id,to_id').eq('event_id', eventId);
      const ms = mutualMatches((all ?? []).map((c) => ({ fromId: c.from_id as string, toId: c.to_id as string })), meId);
      result = { matches: ms.map((id) => byId.get(id)).filter((p): p is Person => !!p).map(card) };
    }
  }

  const view: PlayView = {
    serverNow: now, me: byId.get(meId) ? { ...card(byId.get(meId)!), me: true } : null, phase: ev.phase, noNumber: !me, round, met, recommendation, choice, paper, result, resultsOpen: !!ev.results_open, game,
    pending: first && byId.get(first.toId) ? { round: first.round, to: card(byId.get(first.toId)!) } : null,
  };
  return { view, pendingAll, opposite, table };
}
