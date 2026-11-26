import { NextResponse } from 'next/server';
import { db, hasDb, PHOTO_BUCKET } from '../../../../lib/server/supabase';
import { hash, newToken } from '../../../../lib/server/auth';
import { nextGwanghwamun } from '../../../../lib/server/signup';
import { birthError, formatPhone, isName, isPhone } from '../../../../lib/signup/validate';
import { birthFromKoreanAge, gwApplyRow, gwSource, parseTails } from '../../../../lib/signup/rules';

const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

// shortcut: 같은 주소에서 1시간 10건, 인스턴스별 메모리라 서버가 여러 대면 느슨해짐. 악용이 보이면 Supabase 테이블로 옮기기.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now(), list = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  list.push(now); hits.set(ip, list);
  return process.env.NODE_ENV === 'production' && list.length > 10;
}

/** 광화문연가 랜딩의 신청서. 입금은 수락 뒤에 받고, email 은 받지 않는다 */
export async function POST(req: Request) {
  if (!hasDb()) return fail('아직 신청을 받을 준비가 안 됐어요. 잠시 뒤에 다시 시도해주세요.', 503);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (limited(ip)) return fail('신청이 너무 많아요. 잠시 뒤에 다시 시도해주세요.', 429);

  let f: FormData;
  try { f = await req.formData(); } catch { return fail('보낸 내용을 읽지 못했어요. 사진을 바꿔서 다시 시도해주세요.'); }
  if (f.get('website')) return NextResponse.json({ ok: true, statusToken: newToken() }); // 봇용 숨은 칸

  const s = (k: string, max: number) => String(f.get(k) ?? '').trim().slice(0, max);
  const gender = s('gender', 1), name = s('name', 20), job = s('job', 30), ideal = s('ideal', 200), near = s('near', 3);
  const age = Number(s('age', 3)), phone = formatPhone(s('phone', 20));
  const photo = f.get('photo');
  const source = gwSource(s('from', 20) || null, req.headers.get('user-agent') ?? ''); // 인스타 / QR
  const tails = parseTails(s('avoidTails', 80));

  const next = await nextGwanghwamun();
  if (!next) return fail('아직 신청을 받는 일정이 없어요. 조금만 기다려주세요.');
  const { event, session } = next;
  if (session.closed) return fail('이번 모임은 신청이 마감됐어요.');
  if (gender !== 'f' && gender !== 'm') return fail('성별을 골라주세요.');
  if ((gender === 'f' ? session.seatsF : session.seatsM) === 0) return fail('이 성별은 자리가 다 찼어요.');
  if (!isName(name)) return fail('이름을 확인해주세요.');
  if (!(Number.isInteger(age) && age >= 19 && age <= 60)) return fail('나이를 숫자로 적어주세요.');
  const year = Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(new Date()));
  const birth = birthFromKoreanAge(age, year); // 한국 나이 기준 (모임 나이대도 한국 나이로 정함)
  const birthMsg = birthError(String(birth), event.birth_from, event.birth_to);
  if (birthMsg) return fail(birthMsg.replace('이 일정은', '이번 모임은'));
  if (!isPhone(phone)) return fail('휴대폰 번호를 확인해주세요.');
  if (job.length < 2) return fail('직업을 적어주세요.');
  if (ideal.length < 2) return fail('이상형을 적어주세요.');
  if (near !== 'yes' && near !== 'no') return fail('광화문 근처 근무 여부를 골라주세요.');
  if (tails === null) return fail('마주치고 싶지 않은 분의 휴대폰 뒷번호 4자리를 확인해주세요.');
  if (!(photo instanceof File) || photo.size === 0) return fail('사진 1장을 올려주세요.');
  if (!photo.type.startsWith('image/')) return fail('사진 파일만 올릴 수 있어요.');
  if (photo.size > 4_000_000) return fail('사진이 너무 커요. 다른 사진을 골라주세요.');

  const id = crypto.randomUUID();
  const path = `${event.id}/${id}/1.jpg`;
  const up = await db().storage.from(PHOTO_BUCKET).upload(path, photo, { contentType: photo.type, upsert: false });
  if (up.error) return fail('사진을 저장하지 못했어요. 다시 시도해주세요.', 500);

  const statusToken = newToken();
  const base = { id, event_id: event.id, gender, name, birth_year: birth, phone, email: '', photo_paths: [path], avoid: tails.map((t) => ({ name: `뒷번호 ${t}`, note: '' })), status_token_hash: hash(statusToken) };
  // 0019(ideal·near_work) · 0020(source) 마이그레이션을 아직 안 돌렸으면 없는 칸의 값을 job 칸에 함께 적는다
  let error = null as null | { message: string };
  for (const level of [0, 1, 2] as const) {
    ({ error } = await db().from('applications').insert({ ...base, ...gwApplyRow(job, ideal, near, source, level) }));
    if (!error || !/ideal|near_work|source|column/i.test(error.message)) break;
  }
  if (error) {
    await db().storage.from(PHOTO_BUCKET).remove([path]);
    return fail('신청을 저장하지 못했어요. 다시 시도해주세요.', 500);
  }
  return NextResponse.json({ ok: true, statusToken });
}
