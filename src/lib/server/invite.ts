import 'server-only';
import { cookies } from 'next/headers';
import { db } from './supabase';
import { appFromSigned, hash } from './auth';

/** 입장 쿠키 이름 (행사마다 따로) */
export const inviteCookie = (eventId: string) => `fl_inv_${eventId}`;

export type Invited = { id: string; name: string; gender: 'f' | 'm'; birth_year: number; job: string; number: number | null };

/** 호스트가 모임을 닫았는지 (locked 칸이 아직 없으면 열린 것으로) */
export async function isLocked(eventId: string) {
  const { data, error } = await db().from('events').select('locked').eq('id', eventId).maybeSingle();
  return !error && !!data?.locked;
}

/** 확정된 신청자의 입장 링크(또는 신청 내역 링크)인지 확인 */
export async function findInvited(eventId: string, token: string | undefined) {
  if (!token || (await isLocked(eventId))) return null;
  const appId = appFromSigned(token);
  if (appId) {
    const { data } = await db().from('applications').select('id,name,gender,birth_year,job,number').eq('id', appId).eq('event_id', eventId).eq('status', 'confirmed').maybeSingle();
    return data as Invited | null;
  }
  const h = hash(token); // hex라 or() 필터에 그대로 넣어도 안전
  const { data } = await db().from('applications').select('id,name,gender,birth_year,job,number')
    // 호스트가 보낸 입장 링크든, 신청 내역 링크(상태 토큰)든 확정된 본인이면 들어온다
    .eq('event_id', eventId).eq('status', 'confirmed').or(`invite_token_hash.eq.${h},status_token_hash.eq.${h}`).maybeSingle();
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
