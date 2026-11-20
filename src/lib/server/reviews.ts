import 'server-only';
import { db, hasDb } from './supabase';

/** sample: 더미 게스트('더미…' 이름)에게 달린 예시 후기 → 화면에 '예시'로 표시한다 */
export type Review = { body: string; gender: 'f' | 'm'; age: number; rating: number; sample: boolean };

type Row = { body: string; gender: 'f' | 'm'; age: number; rating?: number | null; applications?: { name: string } | null };

/** 최근 후기 (테이블이 아직 없거나 키가 없으면 빈 목록). rating 칸이 아직 없으면(0015 전) 5점 */
export async function latestReviews(limit = 12): Promise<Review[]> {
  if (!hasDb()) return [];
  const { data } = await db().from('reviews').select('*,applications(name)').order('created_at', { ascending: false }).limit(limit);
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    body: r.body, gender: r.gender, age: r.age, rating: r.rating ?? 5,
    sample: (r.applications?.name ?? '').startsWith('더미'),
  }));
}

export const average = (rs: Review[]) => (rs.length ? rs.reduce((n, r) => n + r.rating, 0) / rs.length : 0);
