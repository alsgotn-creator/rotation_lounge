import { NextResponse } from 'next/server';
import { db, hasDb, PHOTO_BUCKET } from '../../../../lib/server/supabase';
import { hash, newToken } from '../../../../lib/server/auth';
import { nextGwanghwamun } from '../../../../lib/server/signup';
import { birthError, formatPhone, isName, isPhone } from '../../../../lib/signup/validate';
import { birthFromKoreanAge, gwApplyRow, gwSource, parseMbti, parseTails } from '../../../../lib/signup/rules';

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
  const gender = s('gender', 1), name = s('name', 20), job = s('job', 30), ideal = s('ideal', 200), message = s('message', 300), mbti = parseMbti(s('mbti', 4));
  const age = Number(s('age', 3)), phone = formatPhone(s('phone', 20));
  const photos = [f.get('photo'), f.get('photo2')].filter((x): x is File => x instanceof File && x.size > 0).slice(0, 2);
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
  if (mbti === null) return fail('MBTI는 ENFP처럼 4글자로 적어주세요. 모르면 비워두셔도 돼요.');
  if (tails === null) return fail('마주치고 싶지 않은 분의 휴대폰 뒷번호 4자리를 확인해주세요.');
  if (!photos.length || !(f.get('photo') instanceof File)) return fail('얼굴이 나온 사진을 1장 이상 올려주세요.');
  if (photos.some((p) => !p.type.startsWith('image/'))) return fail('사진 파일만 올릴 수 있어요.');
  if (photos.reduce((n, p) => n + p.size, 0) > 4_200_000) return fail('사진이 너무 커요. 다른 사진을 골라주세요.');

  const id = crypto.randomUUID();
  const paths = photos.map((_, i) => `${event.id}/${id}/${i + 1}.jpg`);
  for (const [i, p] of photos.entries()) {
    const up = await db().storage.from(PHOTO_BUCKET).upload(paths[i], p, { contentType: p.type, upsert: false });
    if (up.error) { await db().storage.from(PHOTO_BUCKET).remove(paths); return fail('사진을 저장하지 못했어요. 다시 시도해주세요.', 500); }
  }

  const statusToken = newToken();
  const base = { id, event_id: event.id, gender, name, birth_year: birth, phone, email: '', photo_paths: paths, avoid: tails.map((t) => ({ name: `뒷번호 ${t}`, note: '' })), status_token_hash: hash(statusToken) };
  // 0019(ideal) · 0020(source) · 0021(mbti·host_message) 마이그레이션을 아직 안 돌렸으면 없는 칸의 값을 있는 칸 뒤에 붙인다
  let error = null as null | { message: string };
  for (const level of [0, 1, 2, 3] as const) {
    ({ error } = await db().from('applications').insert({ ...base, ...gwApplyRow({ job, ideal, mbti, message, source }, level) }));
    if (!error || !/ideal|near_work|source|column/i.test(error.message)) break;
  }
  if (error) {
    await db().storage.from(PHOTO_BUCKET).remove(paths);
    return fail('신청을 저장하지 못했어요. 다시 시도해주세요.', 500);
  }
  return NextResponse.json({ ok: true, statusToken });
}
