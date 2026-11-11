import 'server-only';
import { db } from './supabase';
import { loungeCards, type PublicCard } from '../domain/lounge';

export type LoungeView = {
  phase: 'before' | 'talk' | 'choice' | 'closing';
  counts: { f: number; m: number };
  cards: PublicCard[];
};

/** 참가자 한 명에게 보여줄 대기실 (다른 사람의 비공개 정보는 담지 않는다). 나는 신청 id로 찾아서 participantOf 와 같이 보낼 수 있다. */
export async function loungeView(eventId: string, meApplicationId: string): Promise<LoungeView> {
  const [{ data: ev }, { data: rows }] = await Promise.all([
    db().from('events').select('phase').eq('id', eventId).single(),
    db().from('participants').select('id,application_id,gender,number,shape,prop,love_type,keywords,excluded').eq('event_id', eventId).order('created_at'),
  ]);
  const all = (rows ?? []) as (Parameters<typeof loungeCards>[0][number] & { application_id: string })[];
  const cards = loungeCards(all, all.find((r) => r.application_id === meApplicationId)?.id ?? '');
  return { phase: ev!.phase, counts: { f: cards.filter((c) => c.gender === 'f').length, m: cards.filter((c) => c.gender === 'm').length }, cards };
}
