import 'server-only';
import { db } from './supabase';
import { pairs, type Round, type Seated } from '../domain/seating';
import { eventLayout } from './signup';
import { compactNumbers } from '../signup/rules';
import { mutualPairs } from '../domain/matching';

export type Phase = 'before' | 'talk' | 'choice' | 'closing';
export const PHASES: Phase[] = ['before', 'talk', 'choice', 'closing'];

type RoundRow = { no: number; started_at: string; paused_at: string | null; paused_total_ms: number; duration_sec: number; closed_at: string | null };
const t = (s: string | null) => (s ? new Date(s).getTime() : null);
const toRound = (r: RoundRow): Round => ({ no: r.no, startedAt: t(r.started_at)!, pausedAt: t(r.paused_at), pausedTotalMs: Number(r.paused_total_ms), durationSec: r.duration_sec, closedAt: t(r.closed_at) });

export type Person = { id: string; gender: 'f' | 'm'; number: number | null; excluded: boolean; nickname: string; shape: string; prop: string; color: number; keywords: string[]; name: string };

export async function loadRun(eventId: string) {
  // 참가자 폰이 3초마다 부르는 길: 서로 독립인 조회는 한 번에 보낸다 (왕복 수가 곧 속도)
  const [{ data: ev }, { data: rr }, { data: ps }, { perTable }, lk] = await Promise.all([
    db().from('events').select('id,slug,starts_at,venue,phase,table_count,round_duration_sec,max_picks').eq('id', eventId).single(),
    db().from('rounds').select('no,started_at,paused_at,paused_total_ms,duration_sec,closed_at').eq('event_id', eventId).order('no'),
    db().from('participants').select('id,gender,number,excluded,nickname,shape,prop,love_type,keywords,applications(name)').eq('event_id', eventId).order('number', { nullsFirst: false }),
    eventLayout(eventId),
    db().from('events').select('locked').eq('id', eventId).single(), // locked 칸은 마이그레이션 0012 전에는 없을 수 있다 → 그때는 열린 것으로
  ]);
  const rounds = ((rr ?? []) as RoundRow[]).map(toRound);
  const people: Person[] = (ps ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string, gender: p.gender as 'f' | 'm', number: p.number as number | null, excluded: p.excluded as boolean,
    nickname: p.nickname as string, shape: p.shape as string, prop: p.prop as string, color: p.love_type as number, keywords: p.keywords as string[],
    name: ((p.applications as { name: string } | null)?.name) ?? '',
  }));
  const seated: Seated[] = people.filter((p) => p.number != null && !p.excluded).map((p) => ({ id: p.id, gender: p.gender, number: p.number! }));
  const current = rounds.at(-1) ?? null;
  return { ev: { ...ev!, per_table: perTable, locked: !lk.error && !!lk.data?.locked }, rounds, current, people, seated };
}

/** 이번(또는 곧 시작할 1라운드) 테이블별 앉는 사람들 */
export function tablePairs(run: Awaited<ReturnType<typeof loadRun>>) {
  const no = run.current?.no ?? 1;
  const byId = new Map(run.people.map((p) => [p.id, p]));
  return pairs(no, run.ev.table_count, run.seated, run.ev.per_table).map((x) => ({ table: x.table, f: x.f.map((p) => byId.get(p.id)!), m: x.m.map((p) => byId.get(p.id)!) }));
}

export type HostCmd =
  | { type: 'setPhase'; phase: Phase }
  | { type: 'nextRound' } | { type: 'endRound' } | { type: 'pause' } | { type: 'resume' }
  | { type: 'settings'; roundDurationSec?: number; tableCount?: number; maxPicks?: number }
  | { type: 'setNumber'; participantId: string; number: number | null }
  | { type: 'exclude'; participantId: string; excluded: boolean }
  | { type: 'compact' }
  | { type: 'lock'; locked: boolean }
  | { type: 'hideNote'; noteId: string; hidden: boolean }
  | { type: 'reset'; what: ResetWhat };

/** 리허설 뒤 처음으로 되돌리기. rounds는 쪽지·게임까지 지운다 (라운드 번호가 겹치면 쪽지를 다시 못 쓴다). */
export type ResetWhat = 'rounds' | 'notes' | 'choices' | 'closing' | 'all';

export type Moved = { name: string; gender: 'f' | 'm'; from: number | null; to: number | null };
type Result = { ok: true; moved?: Moved[]; tableCount?: number } | { ok: false; message: string };
const no = (message: string): Result => ({ ok: false, message });

async function closeOpen(eventId: string, r: Round | null, now: number) {
  if (!r || r.closedAt) return;
  const extra = r.pausedAt ? now - r.pausedAt : 0;
  await db().from('rounds').update({ closed_at: new Date(now).toISOString(), paused_at: null, paused_total_ms: r.pausedTotalMs + extra }).eq('event_id', eventId).eq('no', r.no);
}

/** 호스트 명령. 아무것도 자동으로 넘어가지 않는다: 시간이 다 돼도 '종료'만 보이고, 다음은 호스트가 누른다. */
export async function runHostCmd(eventId: string, cmd: HostCmd, now = Date.now()): Promise<Result> {
  const { ev, current, people } = await loadRun(eventId);
  const iso = new Date(now).toISOString();
  const open = current && !current.closedAt ? current : null;

  switch (cmd.type) {
    case 'setPhase': {
      if (!PHASES.includes(cmd.phase)) return no('알 수 없는 단계예요.');
      if (cmd.phase === 'choice' || cmd.phase === 'closing') await closeOpen(eventId, open, now);
      await db().from('events').update({ phase: cmd.phase }).eq('id', eventId);
      return { ok: true };
    }
    case 'nextRound': {
      if (current && current.no >= ev.table_count) return no(`마지막 라운드(${ev.table_count})예요. 최종 선택으로 넘어가 주세요.`);
      await closeOpen(eventId, open, now);
      const { error } = await db().from('rounds').insert({ event_id: eventId, no: (current?.no ?? 0) + 1, started_at: iso, paused_at: iso, duration_sec: ev.round_duration_sec }); // 자리 이동 동안은 멈춰 두고, 진행자가 '대화 시작'(resume)을 누르면 흐른다
      if (error) return no('라운드를 시작하지 못했어요. 다시 눌러주세요.');
      if (ev.phase !== 'talk') await db().from('events').update({ phase: 'talk' }).eq('id', eventId);
      return { ok: true };
    }
    case 'endRound':
      if (!open) return no('진행 중인 라운드가 없어요.');
      await closeOpen(eventId, open, now);
      return { ok: true };
    case 'pause':
      if (!open || open.pausedAt) return no('진행 중인 라운드가 없어요.');
      await db().from('rounds').update({ paused_at: iso }).eq('event_id', eventId).eq('no', open.no);
      return { ok: true };
    case 'resume':
      if (!open || !open.pausedAt) return no('멈춘 라운드가 없어요.');
      await db().from('rounds').update({ paused_at: null, paused_total_ms: open.pausedTotalMs + (now - open.pausedAt) }).eq('event_id', eventId).eq('no', open.no);
      return { ok: true };
    case 'settings': {
      const patch: Record<string, number> = {};
      if (cmd.roundDurationSec !== undefined) {
        if (!(cmd.roundDurationSec >= 60 && cmd.roundDurationSec <= 3600)) return no('라운드 시간은 1~60분이에요.');
        patch.round_duration_sec = cmd.roundDurationSec;
      }
      if (cmd.tableCount !== undefined) {
        if (!(cmd.tableCount >= 2 && cmd.tableCount <= 12)) return no('테이블은 2~12개예요.');
        if (current) return no('라운드가 시작된 뒤에는 테이블 수를 바꿀 수 없어요.');
        patch.table_count = cmd.tableCount;
        patch.capacity_per_gender = cmd.tableCount * ev.per_table;
      }
      if (cmd.maxPicks !== undefined) {
        if (cmd.maxPicks !== 2 && cmd.maxPicks !== 3) return no('최종 선택은 2명 또는 3명이에요.');
        patch.max_picks = cmd.maxPicks;
      }
      await db().from('events').update(patch).eq('id', eventId);
      return { ok: true };
    }
    case 'setNumber': {
      const p = people.find((x) => x.id === cmd.participantId);
      if (!p) return no('참가자를 찾지 못했어요.');
      if (cmd.number !== null && !(Number.isInteger(cmd.number) && cmd.number >= 1 && cmd.number <= ev.table_count * ev.per_table)) return no(`번호는 1~${ev.table_count * ev.per_table}예요.`);
      const { error } = await db().from('participants').update({ number: cmd.number }).eq('id', p.id);
      if (error?.code === '23505') return no('같은 성별에 이미 그 번호가 있어요. 먼저 그 사람 번호를 바꿔주세요.');
      if (error) return no('저장하지 못했어요.');
      return { ok: true };
    }
    case 'compact': {
      if (current) return no('라운드가 시작된 뒤에는 번호를 당길 수 없어요.');
      // 확정된 신청자 기준 (사전 등록을 안 했어도 번호는 있다). '안 옴'으로 뺀 사람은 번호를 비운다.
      const { data: apps } = await db().from('applications').select('id,name,gender,number').eq('event_id', eventId).eq('status', 'confirmed');
      const out = new Set(people.filter((p) => p.excluded).map((p) => p.id));
      const { data: parts } = await db().from('participants').select('id,application_id').eq('event_id', eventId);
      const partOf = new Map((parts ?? []).map((p) => [p.application_id as string, p.id as string]));
      const moved: Moved[] = [];
      const setNum = async (appId: string, n: number | null) => {
        await db().from('applications').update({ number: n }).eq('id', appId);
        const pid = partOf.get(appId); if (pid) await db().from('participants').update({ number: n }).eq('id', pid);
      };
      const all = (apps ?? []) as { id: string; name: string; gender: 'f' | 'm'; number: number | null }[];
      for (const a of all) if (a.number != null && out.has(partOf.get(a.id) ?? '')) { await setNum(a.id, null); moved.push({ name: a.name, gender: a.gender, from: a.number, to: null }); }
      let k = { f: 0, m: 0 };
      for (const g of ['f', 'm'] as const) {
        const act = all.filter((a) => a.gender === g && a.number != null && !out.has(partOf.get(a.id) ?? '')).map((a) => ({ id: a.id, number: a.number! }));
        k[g] = act.length;
        for (const [id, to] of compactNumbers(act)) {
          const a = all.find((x) => x.id === id)!;
          await setNum(id, to); moved.push({ name: a.name, gender: g, from: a.number, to });
        }
      }
      const tableCount = Math.max(2, Math.ceil(Math.max(k.f, k.m) / ev.per_table));
      await db().from('events').update({ table_count: tableCount }).eq('id', eventId);
      return { ok: true, moved, tableCount };
    }
    case 'lock': {
      // 모임이 끝나면 닫는다: 참가자 입장(링크·전화번호)만 막고 데이터는 그대로 둔다
      const { error } = await db().from('events').update({ locked: !!cmd.locked }).eq('id', eventId);
      return error ? no('잠금 칸이 아직 없어요. 마이그레이션 0012를 먼저 적용해주세요.') : { ok: true };
    }
    case 'hideNote':
      await db().from('notes').update({ hidden: !!cmd.hidden }).eq('id', cmd.noteId).eq('event_id', eventId);
      return { ok: true };
    case 'reset': {
      const w = cmd.what, all = w === 'all';
      if (!['rounds', 'notes', 'choices', 'closing', 'all'].includes(w)) return no('알 수 없는 초기화예요.');
      const del = (table: string) => db().from(table).delete().eq('event_id', eventId);
      if (all || w === 'rounds') { await del('game_answers'); await del('game_plays'); await del('rounds'); }
      if (all || w === 'rounds' || w === 'notes') await del('notes');
      if (all || w === 'choices') { await del('choices'); await db().from('participants').update({ choice_done_at: null }).eq('event_id', eventId); }
      if (all || w === 'closing') { await del('reviews'); await del('wine_signups'); }
      const patch: Record<string, unknown> = {};
      if (all || w === 'rounds') patch.phase = 'before';
      if (Object.keys(patch).length) await db().from('events').update(patch).eq('id', eventId);
      return { ok: true };
    }
    case 'exclude': {
      await db().from('participants').update({ excluded: !!cmd.excluded }).eq('id', cmd.participantId).eq('event_id', eventId);
      return { ok: true };
    }
    default:
      return no('알 수 없는 명령이에요.'); // 모르는 type 이면 undefined 가 돌아가서 라우트가 500을 낸다
  }
}

/** 호스트만 보는 최종 선택 현황·매칭 커플·쪽지 (참가자 응답에는 절대 넣지 않는다). 표가 아직 없으면 빈 값. */
export async function loadHostExtras(eventId: string, people: Person[]) {
  const [ch0, nt, dn, ap, wn] = await Promise.all([
    db().from('choices').select('from_id,to_id,rank,brave').eq('event_id', eventId).order('rank'),
    db().from('notes').select('id,round,from_id,to_id,body,hidden').eq('event_id', eventId).order('created_at'),
    db().from('participants').select('id,choice_done_at').eq('event_id', eventId),
    db().from('participants').select('id,age,job,application_id,applications(name,phone,email)').eq('event_id', eventId),
    db().from('wine_signups').select('application_id').eq('event_id', eventId), // 표가 없으면 빈 값
  ]);
  const ch = ch0.error ? await db().from('choices').select('from_id,to_id').eq('event_id', eventId) : ch0; // rank 칸이 없을 때
  type Ap = { id: string; age: number; job: string; application_id: string; applications: { name: string; phone: string; email: string } | null };
  const contacts: Record<string, { email: string; phone: string }> = {};
  const wineIds = new Set((wn.error ? [] : (wn.data ?? [])).map((w) => w.application_id as string));
  const wine: { gender: 'f' | 'm'; number: number | null; name: string; age: number; job: string; phone: string; email: string }[] = [];
  for (const a of ((ap.error ? [] : ap.data) ?? []) as unknown as Ap[]) {
    contacts[a.id] = { email: a.applications?.email ?? '', phone: a.applications?.phone ?? '' };
    const pp = people.find((x) => x.id === a.id);
    if (wineIds.has(a.application_id) && pp) wine.push({ gender: pp.gender, number: pp.number, name: a.applications?.name ?? '', age: a.age, job: a.job, phone: a.applications?.phone ?? '', email: a.applications?.email ?? '' });
  }
  const choices = ch.error ? [] : (ch.data ?? []).map((c) => ({ fromId: c.from_id as string, toId: c.to_id as string, brave: !!(c as { brave?: boolean }).brave }));
  const active = people.filter((p) => !p.excluded && p.number != null);
  const picks = active.map((p) => ({ id: p.id, to: choices.filter((c) => c.fromId === p.id).map((c) => c.toId) }));
  const done = dn.error ? picks.filter((x) => x.to.length).length : (dn.data ?? []).filter((d) => d.choice_done_at && active.some((p) => p.id === d.id)).length;
  return {
    picks, matches: mutualPairs(choices), brave: mutualPairs(choices.filter((c) => c.brave)), done, total: active.length, contacts, wine,
    notes: nt.error ? [] : (nt.data ?? []).filter((n) => n.body != null).map((n) => ({ id: n.id as string, round: n.round as number, fromId: n.from_id as string, toId: n.to_id as string, body: n.body as string, hidden: !!n.hidden })),
  };
}
