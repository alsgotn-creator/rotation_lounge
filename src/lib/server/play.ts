import 'server-only';
import { db } from './supabase';
import { loadRun, type Person } from './run';
import { partnersOf, ordinal, tableOf, type Round } from '../domain/seating';
import { cardById, parseTopicId, type TopicState } from '../domain/cards';
import { metIds, pendingNotes, type Pending } from '../domain/turns';
import { phrases, recommend, similarity } from '../domain/loveType';
import { paperFont } from '../domain/notes';
import type { PublicCard } from '../domain/lounge';
import { otherTeam, teamOf, teamTable } from '../domain/double';

export type Profile = { age: number; job: string; area: string; mbti: string; color: number; phrases: string[]; similar: number | null; best: boolean }; // similar: 나와 비슷한 정도 % (더블 라운지는 null: 파트너 매칭 기준이 마지막까지 비밀이고, 좁은 카드엔 정보만 둔다), best: 오늘 이성 중 가장 비슷한 사람
export type PlayView = {
  serverNow: number;
  me: PublicCard | null;                   // 나 (라운드 장면 왼쪽). 상대와 같은 응답에서 와야 섞이지 않는다
  phase: 'before' | 'talk' | 'choice' | 'closing';
  round: null | { no: number; total: number; timer: Round; perTable: number; partners: PublicCard[]; ordinal: number; oppositeCount: number };
  met: Record<string, Profile>;            // 5분 이상 함께 앉았던 사람만 (최종선택 때는 같이 앉았던 사람 모두). 한 번 공개되면 계속 보인다.
  pending: null | { round: number; to: PublicCard };
  choice: null | { max: number; picks: string[]; brave: string | null; done: boolean; candidates: PublicCard[] };
  paper: null | { notes: { id: string; body: string; font: string; from: { gender: 'f' | 'm'; number: number | null } }[] };   // 최종선택 단계에만. 보낸 사람은 '여3호'처럼 호가 보인다
  double: boolean;                         // 더블 라운지(2:2 파트너)
  team: null | { no: number; name: string; partner: PublicCard | null; reveal: null | { similar: number; mbtiSame: number } }; // reveal: 마무리 단계에서만 (파트너 매칭 기준 공개)
  topic: null | TopicState;                // 더블: 이 테이블이 보고 있는 대화 주제 (누가 넘기면 테이블 전체가 같이)
  game: null | { cardId: string; kind: string; prompt: string; options: string[]; mine: string | null; answered: number; total: number; answers: null | { gender: 'f' | 'm'; number: number; me: boolean; text: string }[] };
};

const card = (p: Person): PublicCard => ({ id: p.id, gender: p.gender, number: p.number, shape: p.shape, prop: p.prop, color: p.color, keywords: p.keywords, me: false });

/** 참가자 한 명 기준의 상태. 다른 사람의 비공개 정보는 5분 규칙(metIds)을 통과한 사람만 담는다. */
export async function computePlay(eventId: string, meId: string, now = Date.now()) {
  const run = await loadRun(eventId);
  const { ev, rounds, current, people, seated, teams } = run;
  const T = ev.table_count, g = ev.per_table;
  const byId = new Map(people.map((p) => [p.id, p]));
  const me = seated.find((s) => s.id === meId) ?? null;
  const opposite = people.filter((p) => p.gender !== byId.get(meId)?.gender && p.number != null && !p.excluded);
  const double = ev.kind === 'double';
  const myTeam = double ? teamOf(meId, teams) : null;
  // 그 라운드에 같은 테이블의 상대들: 기본형은 이성, 더블은 상대 팀 두 사람
  const at = (r: number) => (double ? otherTeam(meId, r, teams, T).map((id) => seated.find((s) => s.id === id)).filter((s) => !!s) : partnersOf(me!, r, T, seated, g));

  let round: PlayView['round'] = null;
  if (me && ev.phase === 'talk' && current && !current.closedAt) {
    round = {
      no: current.no, total: T, timer: current, perTable: g,
      partners: at(current.no).sort((a, b) => a.gender.localeCompare(b.gender) || a.number - b.number).map((s) => card(byId.get(s.id)!)),
      ordinal: double ? Array.from({ length: current.no }, (_, i) => i + 1).filter((r) => at(r).length > 0).length : ordinal(me, current.no, T, seated, g),
      oppositeCount: double ? teams.length - 1 : seated.filter((s) => s.gender !== me.gender).length,
    };
  }

  const table = me && round ? (double ? (myTeam ? teamTable(myTeam.no, round.no, T) : null) : tableOf(me, round.no, T, g)) : null;
  const key = me && round && table && round.partners.length ? { event_id: eventId, round: round.no, table_no: table } : null;
  const ids = me ? metIds(me, rounds, T, g, seated, now, ev.phase === 'choice', at) : [];
  const choosing = !!me && ev.phase === 'choice';
  // 더블: 신상은 이성만 (상대 팀 이성 + 내 파트너). 파트너 정보는 전날부터 공개돼 있다
  const mateId = myTeam ? (myTeam.f === meId ? myTeam.m : myTeam.f) : null;
  const pids = double ? [...ids.filter((id) => opposite.some((o) => o.id === id)), ...(mateId ? [mateId] : [])] : ids;
  const paperQ = (cols: string) => db().from('notes').select(cols).eq('event_id', eventId).eq('to_id', meId).eq('hidden', false).not('body', 'is', null).order('created_at');

  // 아래 조회는 서로 독립이다 → 한 번에 보낸다 (3초마다 14대가 부르는 길). 표·칸이 아직 없으면(마이그레이션 전) 각자 error 로 돌아와 건너뛴다.
  const [play, ans, profiles, answerRows, written, cq0, doneRow, paper0] = await Promise.all([
    key ? db().from('game_plays').select('card_id').match(key).maybeSingle() : null,
    key ? db().from('game_answers').select('participant_id,answer').match(key) : null,
    pids.length ? db().from('participants').select('id,age,job,area,mbti,love_type').in('id', pids) : null,
    pids.length ? db().from('participants').select('id,number,answers').in('id', [meId, ...opposite.map((p) => p.id)]) : null,
    me ? db().from('notes').select('round,to_id').eq('event_id', eventId).eq('from_id', meId) : null,
    choosing ? db().from('choices').select('to_id,rank,brave').eq('event_id', eventId).eq('from_id', meId).order('rank') : null,
    choosing ? db().from('participants').select('choice_done_at').eq('id', meId).single() : null,
    choosing ? paperQ('id,body,from_id,font') : null,
  ]);

  // 선택형 페어 게임: 이 테이블의 카드와 답. 테이블 사람이 모두 답해야 서로의 답이 보인다.
  let game: PlayView['game'] = null;
  const c = play && !play.error && play.data ? cardById(play.data.card_id as string) : null;
  if (c && round) {
    const rows = ans?.data ?? [];
    const total = round.partners.length + 1, mine = rows.find((a) => a.participant_id === meId)?.answer ?? null;
    game = {
      cardId: c.id, kind: c.kind, prompt: c.prompt, options: c.options, mine, answered: rows.length, total,
      answers: rows.length >= total ? rows.map((a) => { const p = byId.get(a.participant_id as string)!; return { gender: p.gender, number: p.number!, me: p.id === meId, text: a.answer as string }; }).sort((x, y) => Number(y.me) - Number(x.me) || x.number - y.number) : null,
    };
  }

  // 비슷한 정도는 신상 공개와 함께. 가장 비슷한 이성(추천)도 그 사람이 공개될 때 같이 알려준다.
  const met: PlayView['met'] = {};
  if (profiles) {
    const all = answerRows?.data ?? [];
    const mine = all.find((r) => r.id === meId)?.answers as number[] | undefined;
    const others = all.filter((r) => r.id !== meId).map((r) => ({ id: r.id as string, number: (r.number as number | null) ?? 99, answers: r.answers as number[] }));
    const best = mine ? recommend({ id: meId, answers: mine }, others) : null;
    for (const r of profiles.data ?? []) {
      const theirs = others.find((o) => o.id === r.id)?.answers;
      met[r.id as string] = { age: r.age, job: r.job, area: r.area, mbti: r.mbti, color: r.love_type, phrases: phrases(r.love_type), similar: double ? null : mine && theirs ? similarity(mine, theirs) : 0, best: !double && r.id === best };
    }
  }

  // 롤링페이퍼 밀린 것. 더블 라운지는 상대 팀의 이성 한 명에게만 쓴다 (2026-11-20, 같은 성별에게는 안 씀)
  const noteTo = double ? (r: number) => at(r).filter((s) => s.gender !== me?.gender) : at;
  const pendingAll: Pending[] = me && written && !written.error ? pendingNotes(me, rounds, T, g, seated, new Set((written.data ?? []).map((n) => `${n.round}:${n.to_id}`)), now, ev.phase, noteTo) : [];
  const first = pendingAll[0];

  // 최종 선택
  let choice: PlayView['choice'] = null;
  if (choosing) {
    const cq = cq0?.error ? await db().from('choices').select('to_id').eq('event_id', eventId).eq('from_id', meId) : cq0!; // rank 칸이 없을 때
    const picks = (cq.data ?? []).map((c) => c.to_id as string); // 순위 순서
    const brave = ((cq.data ?? []) as { to_id: string; brave?: boolean }[]).find((c) => c.brave)?.to_id ?? null;
    choice = { max: double ? 2 : ev.max_picks, picks, brave, done: doneRow && !doneRow.error ? !!doneRow.data?.choice_done_at : picks.length > 0, candidates: opposite.filter((p) => !double || ids.includes(p.id) || (myTeam && (p.id === myTeam.f || p.id === myTeam.m))).sort((a, b) => a.number! - b.number!).map(card) }; // 더블: 파트너 + 같은 테이블에 앉았던 이성만
  }

  // 받은 쪽지는 최종선택 단계에서 (고르기 전에) 읽는다. 매칭 결과는 앱에 보여주지 않고 진행자가 따로 연락한다.
  let paper: PlayView['paper'] = null;
  if (choosing) {
    const res = paper0?.error ? await paperQ('id,body,from_id') : paper0!; // font 칸이 아직 없을 때
    const data = (res.data ?? []) as unknown as { id: string; body: string; from_id: string; font?: string | null }[];
    paper = { notes: data.map((n) => { const f = byId.get(n.from_id); return { id: n.id, body: n.body, font: paperFont(n.font), from: { gender: (f?.gender ?? 'f') as 'f' | 'm', number: f?.number ?? null } }; }) };
  }
  const view: PlayView = {
    serverNow: now, me: byId.get(meId) ? { ...card(byId.get(meId)!), me: true } : null, phase: ev.phase, round, met, choice, paper, game, double,
    topic: double && key ? parseTopicId(play && !play.error ? (play.data?.card_id as string | undefined) : null) : null,
    team: myTeam && {
      no: myTeam.no, name: myTeam.name,
      partner: (() => { const p = byId.get(myTeam.f === meId ? myTeam.m : myTeam.f); return p ? card(p) : null; })(),
      reveal: ev.phase === 'closing' ? { similar: myTeam.similar, mbtiSame: myTeam.mbtiSame } : null,
    },
    pending: first && byId.get(first.toId) ? { round: first.round, to: card(byId.get(first.toId)!) } : null,
  };
  return { view, pendingAll, opposite, table };
}
