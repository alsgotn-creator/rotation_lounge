import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/server/supabase';
import { getEvent } from '../../../../../lib/server/signup';
import { invitedFromCookie, participantOf } from '../../../../../lib/server/invite';
import { preScreen, chatOpensAt, PRE_STAGES, teamTable, type PreStage } from '../../../../../lib/domain/double';
import { createHmac } from 'node:crypto';
import { wcCard } from '../../../../../lib/domain/worldcup';

export const dynamic = 'force-dynamic';
const fail = (message: string, status = 400) => NextResponse.json({ ok: false, message }, { status });

export type TeamView = null | {
  no: number; name: string; firstTable: number;
  /** 둘만의 실시간 채널 이름(입력 중 표시 · 새 메시지 알림). 추측할 수 없게 서버 비밀로 만든다 */
  channel: string;
  partner: { gender: 'f' | 'm'; number: number | null; shape: string; prop: string; color: number; keywords: string[]; age: number; job: string; area: string; mbti: string; ideal: string; charm: string; wc: { id: string; line: string } | null };
  messages: { id: string; me: boolean; body: string; at: string }[];
};

const teamChannel = (eventId: string, no: number) => 'tm-' + createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').update(`team:${eventId}:${no}`).digest('base64url').slice(0, 24);

/** 시작 전 화면: wait = 채팅방 열리기 전, chat = 채팅방, lounge = 라운지. chatFrom = 채팅방이 저절로 열리는 시각 */
export type TeamScreen = { screen: 'wait' | 'chat' | 'lounge'; chatFrom: number };

/** 더블 라운지: 내 팀(파트너 정보 · 팀 이름 · 둘만의 채팅). 파트너가 누구와 왜 묶였는지(매칭 기준)는 담지 않는다. */
async function load(slug: string) {
  const event = await getEvent({ slug });
  if (!event) return null;
  const me = await invitedFromCookie(event.id);
  const p = me && (await participantOf(me.id));
  if (!p) return null;
  const [{ data: t }, { data: ev }, st] = await Promise.all([
    db().from('teams').select('no,f_id,m_id,name').eq('event_id', event.id).or(`f_id.eq.${p.id},m_id.eq.${p.id}`).maybeSingle(),
    db().from('events').select('phase,starts_at').eq('id', event.id).single(),
    db().from('events').select('pre_stage').eq('id', event.id).single(), // 0016 전에는 없다 → auto
  ]);
  const stage: PreStage = !st.error && PRE_STAGES.includes(st.data?.pre_stage) ? st.data!.pre_stage : 'auto';
  const scr: TeamScreen = { screen: preScreen(ev?.phase ?? 'before', stage, ev?.starts_at ?? event.starts_at), chatFrom: stage === 'wait' ? 0 : chatOpensAt(ev?.starts_at ?? event.starts_at) }; // 대기면 날짜를 약속하지 않는다
  // 채팅방이 열리기 전(모임 이틀 전까지)에는 파트너도 채팅도 보이지 않는다
  return { event, p, scr, t: scr.screen === 'wait' ? null : (t as { no: number; f_id: string; m_id: string; name: string } | null) };
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const x = await load((await params).slug);
  if (!x) return fail('입장 링크로 다시 들어와주세요.', 401);
  const { event, p, t, scr } = x;
  if (!t) return NextResponse.json({ ok: true, team: null, ...scr }, { headers: { 'cache-control': 'no-store' } });
  const partnerId = t.f_id === p.id ? t.m_id : t.f_id;
  const [{ data: ps }, { data: msgs }, { data: ev }] = await Promise.all([
    db().from('participants').select('id,gender,number,shape,prop,love_type,keywords,age,job,area,mbti,ideal,charm').eq('id', partnerId),
    db().from('team_messages').select('id,from_id,body,created_at').eq('event_id', event.id).eq('team_no', t.no).order('created_at').limit(300),
    db().from('events').select('table_count').eq('id', event.id).single(),
  ]);
  const w = await db().from('participants').select('worldcup').eq('id', partnerId).maybeSingle(); // 0023 전엔 칸이 없다 → 없음
  const wc = !w.error && w.data?.worldcup?.winner ? wcCard(w.data.worldcup.winner) : null;
  const o = ps?.[0];
  const team: TeamView = o ? {
    no: t.no, name: t.name, channel: teamChannel(event.id, t.no), firstTable: teamTable(t.no, 1, ev?.table_count ?? 1),
    partner: { gender: o.gender, number: o.number, shape: o.shape, prop: o.prop, color: o.love_type, keywords: o.keywords, age: o.age, job: o.job, area: o.area, mbti: o.mbti, ideal: o.ideal ?? '', charm: o.charm ?? '', wc },
    messages: (msgs ?? []).map((m) => ({ id: m.id, me: m.from_id === p.id, body: m.body, at: m.created_at })),
  } : null;
  return NextResponse.json({ ok: true, team, ...scr }, { headers: { 'cache-control': 'no-store' } });
}

// {type:'msg', body} 채팅 보내기 / {type:'name', name} 팀 이름 정하기 (둘 다 누구나, 마지막에 정한 이름이 남는다)
export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const x = await load((await params).slug);
  if (!x) return fail('입장 링크로 다시 들어와주세요.', 401);
  const { event, p, t } = x;
  if (!t) return fail(x.scr.screen === 'wait' ? '채팅방은 모임 이틀 전에 열려요.' : '아직 파트너가 정해지지 않았어요.', 409);
  const b = await req.json().catch(() => ({}));
  if (b.type === 'msg') {
    const body = String(b.body ?? '').trim();
    if (body.length < 1 || body.length > 300) return fail('1~300자로 적어주세요.');
    // 채팅은 대화라 '인스타' 같은 말은 막지 않고, 전화번호·오픈채팅 링크만 막는다
    if (/\d{7,}|open\.kakao/i.test(body.replace(/[\s.-]/g, ''))) return fail('연락처는 보낼 수 없어요. 모임에서 직접 만나요!');
    const { error } = await db().from('team_messages').insert({ event_id: event.id, team_no: t.no, from_id: p.id, body });
    return error ? fail('보내지 못했어요. 다시 시도해주세요.', 500) : NextResponse.json({ ok: true });
  }
  if (b.type === 'name') {
    const name = String(b.name ?? '').trim();
    if (name.length < 1 || name.length > 15) return fail('팀 이름은 1~15자로 지어주세요.');
    const { error } = await db().from('teams').update({ name }).eq('event_id', event.id).eq('no', t.no);
    return error ? fail('저장하지 못했어요.', 500) : NextResponse.json({ ok: true });
  }
  return fail('알 수 없는 요청이에요.');
}
