import 'server-only';
import { db, hasDb, PHOTO_BUCKET } from './supabase';
import { hash } from './auth';
import { SAMPLE_EVENTS } from '../signup/data';
import { toSession, type AppStatus, type EventRow, type Gender, type Session } from '../signup/rules';

export const EVENT_COLS = 'id,slug,title,starts_at,venue,birth_from,birth_to,capacity_per_gender,apply_open,price,payment_due_days';

export type Application = {
  id: string; event_id: string; gender: Gender; name: string; birth_year: number; phone: string; email: string; job: string;
  photo_paths: string[]; avoid: { name: string; note: string }[]; status: AppStatus; payment_due: string | null;
  invite_token_hash: string | null; created_at: string; number: number | null;
};

async function seatRows(eventIds: string[]) {
  if (!eventIds.length) return [];
  const { data, error } = await db().from('applications').select('event_id,gender,status').in('event_id', eventIds);
  if (error) throw error;
  return data as { event_id: string; gender: Gender; status: AppStatus }[];
}

/** 소개·신청 화면에 보여줄 앞으로의 일정 (키가 없으면 예시 일정) */
export async function listSessions(): Promise<Session[]> {
  // 키가 없으면 로컬에서만 예시 일정을 보여주고, 배포 사이트에서는 빈 목록 (가짜 일정에 신청하지 않게)
  if (!hasDb()) return process.env.NODE_ENV === 'production' ? [] : SAMPLE_EVENTS.map((e) => toSession(e, []));
  // 신청을 닫은 모임과 'demo-' 시연 모임은 공개 목록에서 뺀다 (입장 링크·호스트 화면은 그대로)
  const { data, error } = await db().from('events').select(EVENT_COLS).gt('starts_at', new Date().toISOString()).eq('apply_open', true).not('slug', 'like', 'demo-%').order('starts_at');
  if (error) throw error;
  const events = data as EventRow[];
  const apps = await seatRows(events.map((e) => e.id));
  return events.map((e) => toSession(e, apps.filter((a) => a.event_id === e.id)));
}

export async function getEvent(by: { id?: string; slug?: string }) {
  const q = db().from('events').select(EVENT_COLS);
  const { data } = await (by.id ? q.eq('id', by.id) : q.eq('slug', by.slug!)).maybeSingle();
  return data as EventRow | null;
}

export async function eventSeats(e: EventRow) {
  return toSession(e, await seatRows([e.id]));
}

export async function findByStatusToken(token: string) {
  const { data } = await db().from('applications').select('*').eq('status_token_hash', hash(token)).maybeSingle();
  if (!data) return null;
  const event = await getEvent({ id: data.event_id });
  return event ? { app: data as Application, event } : null;
}

export async function listApplications(eventId: string) {
  const { data, error } = await db().from('applications').select('*').eq('event_id', eventId).order('created_at', { ascending: false });
  if (error) throw error;
  return data as Application[];
}

export async function photoUrls(paths: string[]) {
  if (!paths.length) return [];
  const { data } = await db().storage.from(PHOTO_BUCKET).createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl ?? '');
}

/** 테이블 수와 한 테이블 인원. per_table 칸이 아직 없으면(마이그레이션 전) 1:1로 본다. */
export async function eventLayout(eventId: string) {
  const a = await db().from('events').select('table_count,per_table').eq('id', eventId).single();
  if (!a.error && a.data) return { tables: a.data.table_count as number, perTable: a.data.per_table as number };
  const b = await db().from('events').select('table_count').eq('id', eventId).single();
  return { tables: (b.data?.table_count as number) ?? 7, perTable: 1 };
}
