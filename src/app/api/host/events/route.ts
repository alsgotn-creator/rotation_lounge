import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { db } from '../../../../lib/server/supabase';
import { isHost } from '../../../../lib/server/auth';
import { PRICE } from '../../../../lib/signup/data';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

export async function POST(req: Request) {
  if (!(await isHost())) return fail('다시 로그인해주세요.', 401);
  const b = await req.json().catch(() => ({}));
  const date = String(b.date ?? ''), time = String(b.time ?? '');
  const startsAt = new Date(`${date}T${time}:00+09:00`);
  const birthFrom = Number(b.birthFrom), birthTo = Number(b.birthTo), capacity = Number(b.capacity);
  const venue = String(b.venue ?? '').trim().slice(0, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || isNaN(startsAt.getTime())) return fail('날짜와 시간을 확인해주세요.');
  if (startsAt.getTime() < Date.now()) return fail('지난 날짜예요.');
  if (!venue) return fail('장소를 적어주세요.');
  if (!(birthFrom >= 1950 && birthTo <= 2010 && birthFrom <= birthTo)) return fail('나이대를 확인해주세요.');
  if (!(capacity >= 3 && capacity <= 12)) return fail('성별당 인원은 3~12명이에요.');

  const slug = randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toLowerCase();
  const { error } = await db().from('events').insert({
    slug, starts_at: startsAt.toISOString(), venue, birth_from: birthFrom, birth_to: birthTo,
    capacity_per_gender: capacity, table_count: capacity, price: PRICE,
  });
  if (error) return fail('저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true, slug });
}

export async function PATCH(req: Request) {
  if (!(await isHost())) return fail('다시 로그인해주세요.', 401);
  const b = await req.json().catch(() => ({}));
  const { error } = await db().from('events').update({ apply_open: !!b.applyOpen }).eq('id', String(b.id ?? ''));
  if (error) return fail('바꾸지 못했어요.', 500);
  return NextResponse.json({ ok: true });
}
