import { NextResponse } from 'next/server';
import { db, hasDb, PHOTO_BUCKET } from '../../../lib/server/supabase';
import { hash, newToken } from '../../../lib/server/auth';
import { eventSeats, getEvent } from '../../../lib/server/signup';
import { isBirth, isEmail, isName, isPhone, formatPhone } from '../../../lib/signup/validate';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// shortcut: 인스턴스별 메모리 제한이라 서버가 여러 대면 느슨해짐. 악용이 보이면 Supabase 테이블로 옮기기.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), list = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return list.length > 5;
}

export async function POST(req: Request) {
  if (!hasDb()) return fail('아직 신청을 받을 준비가 안 됐어요. 잠시 뒤에 다시 시도해주세요.', 503);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (limited(ip)) return fail('신청이 너무 많아요. 잠시 뒤에 다시 시도해주세요.', 429);

  let f: FormData;
  try { f = await req.formData(); } catch { return fail('보낸 내용을 읽지 못했어요. 사진 크기를 줄여서 다시 시도해주세요.'); }
  if (f.get('website')) return NextResponse.json({ ok: true, statusToken: newToken() }); // 봇용 숨은 칸

  const s = (k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max);
  const eventId = s('eventId', 64), gender = s('gender', 1), name = s('name', 20), birth = s('birth', 4);
  const phone = formatPhone(s('phone', 20)), email = s('email', 100).toLowerCase(), job = s('job', 30);
  let avoid: { name: string; note: string }[] = [];
  try {
    avoid = (JSON.parse(String(f.get('avoid') ?? '[]')) as { name: string; note: string }[]).slice(0, 5)
      .map((a) => ({ name: String(a.name ?? '').trim().slice(0, 20), note: String(a.note ?? '').trim().slice(0, 40) })).filter((a) => a.name);
  } catch { return fail('지인 정보를 다시 확인해주세요.'); }
  const photos = f.getAll('photos').filter((p): p is File => p instanceof File && p.size > 0);

  const event = await getEvent({ id: eventId });
  if (!event) return fail('일정을 찾지 못했어요.');
  const session = await eventSeats(event);
  if (session.closed) return fail('신청이 마감된 일정이에요.');
  if (gender !== 'f' && gender !== 'm') return fail('성별을 골라주세요.');
  if ((gender === 'f' ? session.seatsF : session.seatsM) === 0) return fail('이 성별은 자리가 다 찼어요.');
  if (!isName(name)) return fail('이름을 확인해주세요.');
  if (!isBirth(birth, event.birth_from, event.birth_to)) return fail('출생연도를 확인해주세요.');
  if (!isPhone(phone)) return fail('휴대폰 번호를 확인해주세요.');
  if (!isEmail(email)) return fail('이메일을 확인해주세요.');
  if (job.length < 2) return fail('하는 일을 적어주세요.');
  if (photos.length < 1 || photos.length > 3) return fail('사진을 1~3장 올려주세요.');
  if (photos.some((p) => !p.type.startsWith('image/') || p.size > 3_000_000)) return fail('사진은 3MB 이하 이미지만 올릴 수 있어요.');

  const id = crypto.randomUUID();
  const paths: string[] = [];
  for (const [i, p] of photos.entries()) {
    const path = `${event.id}/${id}/${i}.jpg`;
    const { error } = await db().storage.from(PHOTO_BUCKET).upload(path, p, { contentType: p.type });
    if (error) {
      if (paths.length) await db().storage.from(PHOTO_BUCKET).remove(paths);
      return fail('사진을 올리지 못했어요. 다시 시도해주세요.', 500);
    }
    paths.push(path);
  }

  const statusToken = newToken();
  const { error } = await db().from('applications').insert({
    id, event_id: event.id, gender, name, birth_year: Number(birth), phone, email, job,
    photo_paths: paths, avoid, status_token_hash: hash(statusToken),
  });
  if (error) {
    await db().storage.from(PHOTO_BUCKET).remove(paths);
    return fail('신청을 저장하지 못했어요. 다시 시도해주세요.', 500);
  }
  return NextResponse.json({ ok: true, statusToken });
}
