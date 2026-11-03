import 'server-only';
import { db } from './supabase';
import { pairs, type Round, type Seated } from '../domain/seating';

export type Phase = 'before' | 'talk' | 'choice' | 'closing';
export const PHASES: Phase[] = ['before', 'talk', 'choice', 'closing'];

type RoundRow = { no: number; started_at: string; paused_at: string | null; paused_total_ms: number; duration_sec: number; closed_at: string | null };
const t = (s: string | null) => (s ? new Date(s).getTime() : null);
const toRound = (r: RoundRow): Round => ({ no: r.no, startedAt: t(r.started_at)!, pausedAt: t(r.paused_at), pausedTotalMs: Number(r.paused_total_ms), durationSec: r.duration_sec, closedAt: t(r.closed_at) });

export type Person = { id: string; gender: 'f' | 'm'; number: number | null; excluded: boolean; nickname: string; shape: string; prop: string; color: number; keywords: string[]; name: string };

export async function loadRun(eventId: string) {
  const [{ data: ev }, { data: rr }, { data: ps }] = await Promise.all([
    db().from('events').select('id,slug,starts_at,venue,phase,table_count,round_duration_sec,max_picks,screen_key').eq('id', eventId).single(),
    db().from('rounds').select('*').eq('event_id', eventId).order('no'),
    db().from('participants').select('id,gender,number,excluded,nickname,shape,prop,love_type,keywords,applications(name)').eq('event_id', eventId).order('number', { nullsFirst: false }),
  ]);
  const rounds = ((rr ?? []) as RoundRow[]).map(toRound);
  const people: Person[] = (ps ?? []).map((p: Record<string, unknown>) => ({
    id: p.id as string, gender: p.gender as 'f' | 'm', number: p.number as number | null, excluded: p.excluded as boolean,
    nickname: p.nickname as string, shape: p.shape as string, prop: p.prop as string, color: p.love_type as number, keywords: p.keywords as string[],
    name: ((p.applications as { name: string } | null)?.name) ?? '',
  }));
  const seated: Seated[] = people.filter((p) => p.number != null && !p.excluded).map((p) => ({ id: p.id, gender: p.gender, number: p.number! }));
  const current = rounds.at(-1) ?? null;
  return { ev: ev!, rounds, current, people, seated };
}

/** 이번(또는 곧 시작할 1라운드) 테이블별 짝 */
export function tablePairs(run: Awaited<ReturnType<typeof loadRun>>) {
  const no = run.current?.no ?? 1;
  const byId = new Map(run.people.map((p) => [p.id, p]));
  return pairs(no, run.ev.table_count, run.seated).map((x) => ({ table: x.table, f: x.f ? byId.get(x.f.id)! : null, m: x.m ? byId.get(x.m.id)! : null }));
}

export type HostCmd =
  | { type: 'setPhase'; phase: Phase }
  | { type: 'nextRound' } | { type: 'endRound' } | { type: 'pause' } | { type: 'resume' }
  | { type: 'settings'; roundDurationSec?: number; tableCount?: number; maxPicks?: number }
  | { type: 'setNumber'; participantId: string; number: number | null }
  | { type: 'exclude'; participantId: string; excluded: boolean };

type Result = { ok: true } | { ok: false; message: string };
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
      const { error } = await db().from('rounds').insert({ event_id: eventId, no: (current?.no ?? 0) + 1, started_at: iso, duration_sec: ev.round_duration_sec });
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
      if (cmd.number !== null && !(Number.isInteger(cmd.number) && cmd.number >= 1 && cmd.number <= ev.table_count)) return no(`번호는 1~${ev.table_count}예요.`);
      const { error } = await db().from('participants').update({ number: cmd.number }).eq('id', p.id);
      if (error?.code === '23505') return no('같은 성별에 이미 그 번호가 있어요. 먼저 그 사람 번호를 바꿔주세요.');
      if (error) return no('저장하지 못했어요.');
      return { ok: true };
    }
    case 'exclude': {
      await db().from('participants').update({ excluded: cmd.excluded }).eq('id', cmd.participantId).eq('event_id', eventId);
      return { ok: true };
    }
  }
}
