import 'server-only';
import { db } from './supabase';
import { hash } from './auth';

/** 입장 쿠키 이름. 라운지 앱(계획서 Task 7)의 참가자 쿠키 fl_{eventId}와 따로 둔다. */
export const inviteCookie = (eventId: string) => `fl_inv_${eventId}`;

/** 확정된 신청자의 입장 링크인지 확인 */
export async function findInvited(eventId: string, token: string | undefined) {
  if (!token) return null;
  const { data } = await db().from('applications').select('id,name,gender,birth_year,job')
    .eq('event_id', eventId).eq('status', 'confirmed').eq('invite_token_hash', hash(token)).maybeSingle();
  return data as { id: string; name: string; gender: 'f' | 'm'; birth_year: number; job: string } | null;
}
