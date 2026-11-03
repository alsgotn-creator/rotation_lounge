import 'server-only';
import { db } from './supabase';
import { loungeCards, takenTables, type PublicCard } from '../domain/lounge';

export const SEAT_OPEN_MS = 3 * 3600_000;
export const seatOpen = (startsAt: string, now = Date.now()) => now >= new Date(startsAt).getTime() - SEAT_OPEN_MS;

export type LoungeView = {
  phase: 'before' | 'talk' | 'choice' | 'closing';
  tableCount: number;
  counts: { f: number; m: number };
  cards: PublicCard[];
  myNumber: number | null;
  taken: number[];
  seatOpen: boolean; // 행사 3시간 전부터 자리를 고를 수 있다 (현장에서 앉은 뒤 누르게)
};

/** 참가자 한 명에게 보여줄 대기실 (다른 사람의 비공개 정보는 담지 않는다) */
export async function loungeView(eventId: string, meParticipantId: string): Promise<LoungeView> {
  const [{ data: ev }, { data: rows }] = await Promise.all([
    db().from('events').select('phase,table_count,starts_at').eq('id', eventId).single(),
    db().from('participants').select('id,gender,number,shape,prop,love_type,keywords,excluded').eq('event_id', eventId).order('created_at'),
  ]);
  const all = (rows ?? []) as Parameters<typeof loungeCards>[0];
  const me = all.find((r) => r.id === meParticipantId)!;
  const cards = loungeCards(all, meParticipantId);
  return {
    phase: ev!.phase, tableCount: ev!.table_count,
    counts: { f: cards.filter((c) => c.gender === 'f').length, m: cards.filter((c) => c.gender === 'm').length },
    cards, myNumber: me?.number ?? null, taken: me ? takenTables(all, me.gender, me.id) : [],
    seatOpen: seatOpen(ev!.starts_at),
  };
}
