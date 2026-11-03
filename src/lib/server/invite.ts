import 'server-only';
import { cookies } from 'next/headers';
import { db } from './supabase';
import { hash } from './auth';

/** 입장 쿠키 이름 (행사마다 따로) */
export const inviteCookie = (eventId: string) => `fl_inv_${eventId}`;

export type Invited = { id: string; name: string; gender: 'f' | 'm'; birth_year: number; job: string; number: number | null };

/** 확정된 신청자의 입장 링크인지 확인 */
export async function findInvited(eventId: string, token: string | undefined) {
  if (!token) return null;
  const { data } = await db().from('applications').select('id,name,gender,birth_year,job,number')
    .eq('event_id', eventId).eq('status', 'confirmed').eq('invite_token_hash', hash(token)).maybeSingle();
  return data as Invited | null;
}

/** 쿠키로 지금 들어온 참가자(신청자) 찾기 */
export async function invitedFromCookie(eventId: string) {
  return findInvited(eventId, (await cookies()).get(inviteCookie(eventId))?.value);
}

export type ParticipantRow = {
  id: string; nickname: string; gender: 'f' | 'm'; age: number; job: string; area: string; mbti: string;
  keywords: string[]; answers: number[]; love_type: number; shape: string; prop: string; number: number | null;
};

export async function participantOf(applicationId: string) {
  const { data } = await db().from('participants')
    .select('id,nickname,gender,age,job,area,mbti,keywords,answers,love_type,shape,prop,number').eq('application_id', applicationId).maybeSingle();
  return data as ParticipantRow | null;
}
