import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { db } from '../../../../lib/server/supabase';
import { eventLayout } from '../../../../lib/server/signup';
import { isHost } from '../../../../lib/server/auth';
import { PRICE } from '../../../../lib/signup/data';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

export async function POST(req: Request) {
  if (!(await isHost())) return fail('다시 로그인해주세요.', 401);
  const b = await req.json().catch(() => ({}));
  const date = String(b.date ?? ''), time = String(b.time ?? '');
  const startsAt = new Date(`${date}T${time}:00+09:00`);
  const birthFrom = Number(b.birthFrom), birthTo = Number(b.birthTo);
  const tables = Number(b.tables), perTable = Number(b.perTable ?? 1);
  const venue = String(b.venue ?? '').trim().slice(0, 40);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || isNaN(startsAt.getTime())) return fail('날짜와 시간을 확인해주세요.');
  if (startsAt.getTime() < Date.now()) return fail('지난 날짜예요.');
  if (!venue) return fail('장소를 적어주세요.');
  if (!(birthFrom >= 1950 && birthTo <= 2010 && birthFrom <= birthTo)) return fail('나이대를 확인해주세요.');
  if (!(Number.isInteger(tables) && tables >= 2 && tables <= 12)) return fail('테이블은 2~12개예요.');
  if (!(Number.isInteger(perTable) && perTable >= 1 && perTable <= 3)) return fail('한 테이블 인원은 1:1, 2:2, 3:3 중에서 골라주세요.');

  const slug = randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toLowerCase();
  const capacity = tables * perTable; // 성별당 최대 인원
  const { error } = await db().from('events').insert({
    slug, starts_at: startsAt.toISOString(), venue, birth_from: birthFrom, birth_to: birthTo,
    capacity_per_gender: capacity, table_count: tables, price: PRICE, round_duration_sec: 720,
    ...(perTable > 1 ? { per_table: perTable } : {}),
  });
  if (error) return fail(perTable > 1 || capacity > 12 ? 'Supabase에서 0005_per_table.sql을 먼저 실행해주세요.' : '저장하지 못했어요. 다시 시도해주세요.', 500);
  return NextResponse.json({ ok: true, slug });
}

export async function PATCH(req: Request) {
  if (!(await isHost())) return fail('다시 로그인해주세요.', 401);
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? '');
  if (b.applyOpen !== undefined) {
    const { error } = await db().from('events').update({ apply_open: !!b.applyOpen }).eq('id', id);
    if (error) return fail('바꾸지 못했어요.', 500);
  }
  if (b.tables !== undefined || b.perTable !== undefined) {
    // 테이블 수와 한 테이블 인원. 성별당 최대 인원 = 테이블 수 x 한 테이블 인원
    const now = await eventLayout(id);
    const tables = Number(b.tables ?? now.tables), perTable = Number(b.perTable ?? now.perTable);
    if (!(Number.isInteger(tables) && tables >= 2 && tables <= 12)) return fail('테이블은 2~12개예요.');
    if (!(Number.isInteger(perTable) && perTable >= 1 && perTable <= 3)) return fail('한 테이블 인원은 1:1, 2:2, 3:3 중에서 골라주세요.');
    const { count } = await db().from('rounds').select('no', { count: 'exact', head: true }).eq('event_id', id);
    if (count) return fail('라운드가 시작된 뒤에는 바꿀 수 없어요.');
    const cap = tables * perTable;
    const { data: apps } = await db().from('applications').select('gender,status,number').eq('event_id', id).in('status', ['awaiting_payment', 'confirmed']);
    const rows = apps ?? [];
    for (const g of ['f', 'm']) {
      const mine = rows.filter((a) => a.gender === g);
      if (mine.length > cap) return fail(`${g === 'f' ? '여성' : '남성'}이 이미 ${mine.length}명 잡혀 있어서 ${cap}명보다 줄일 수 없어요.`);
      const top = Math.max(0, ...mine.map((a) => a.number ?? 0));
      if (top > cap) return fail(`${g === 'f' ? '여' : '남'}${top}호가 있어요. 진행 화면에서 '번호 당기기'를 먼저 해주세요.`);
    }
    const patch: Record<string, number> = { capacity_per_gender: cap, table_count: tables };
    if (perTable !== now.perTable) patch.per_table = perTable;
    const { error } = await db().from('events').update(patch).eq('id', id);
    if (error) return fail(perTable > 1 || cap > 12 ? 'Supabase에서 0005_per_table.sql을 먼저 실행해주세요.' : '바꾸지 못했어요.', 500);
  }
  return NextResponse.json({ ok: true });
}
