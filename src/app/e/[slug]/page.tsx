import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Icon } from '../../../components/Icon';
import { getEvent } from '../../../lib/server/signup';
import { hasDb } from '../../../lib/server/supabase';
import { loungeView } from '../../../lib/server/lounge';
import { invitedFromCookie, isLocked, participantOf } from '../../../lib/server/invite';
import { toSession } from '../../../lib/signup/rules';
import { BUSINESS } from '../../../lib/signup/data';
import type { Shape } from '../../../lib/domain/register';
import Entry from './Entry';

export const metadata: Metadata = { title: '라운지 · 플러팅 라운지', robots: { index: false } };
export const dynamic = 'force-dynamic';

// 참가자 전용 라운지: 사전 등록 → 대기실·자리 고르기. 라운드 화면은 계획서 Task 10에서 이어 붙인다.
export default async function Lounge({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ bad?: string; step?: string }> }) {
  if (!hasDb()) notFound();
  const { slug } = await params;
  const { bad, step } = await searchParams;
  const devStep = process.env.NODE_ENV === 'development' && step ? Number(step) : undefined; // 개발 중 화면 확인용
  const event = await getEvent({ slug });
  if (!event) notFound();
  const me = await invitedFromCookie(event.id);

  if (!me && (await isLocked(event.id))) return (
    <main className="fin">
      <div className="big" style={{ background: 'var(--surf2)', boxShadow: 'none' }}><span style={{ color: 'var(--acc)' }}><Icon name="lock" /></span></div>
      <h2 className="q">끝난 모임이에요</h2>
      <p className="ds">함께해주셔서 고마웠어요.<br />다음 모임에서 또 만나요!</p>
      <a className="btn" href="/" style={{ marginTop: 28, maxWidth: 280, textDecoration: 'none' }}>첫 화면으로</a>
      <p className="preview" style={{ marginTop: 16 }}>문의 {BUSINESS.email}</p>
    </main>
  );

  if (!me) return (
    <main className="fin">
      <div className="big" style={{ background: 'var(--surf2)', boxShadow: 'none' }}><span style={{ color: 'var(--acc)' }}><Icon name="lock" /></span></div>
      <h2 className="q">입장 링크가 필요해요</h2>
      <p className="ds">{bad ? '링크가 맞지 않거나, 신청이 취소됐거나, 새 링크로 바뀌었어요.' : '이 라운지는 참가가 확정된 분만 들어올 수 있어요.'}<br />첫 화면의 <a href="/"><b>라운지 입장</b></a>에 신청할 때 쓴 휴대폰 번호를 넣어주세요.</p>
      <a className="btn" href="/" style={{ marginTop: 28, maxWidth: 280, textDecoration: 'none' }}>첫 화면으로</a>
      <p className="preview" style={{ marginTop: 16 }}>문의 {BUSINESS.email}</p>
    </main>
  );

  const p = await participantOf(me.id);
  const lounge = p ? await loungeView(event.id, p.id) : null;
  const s = toSession(event, []);
  const given = { gender: me.gender, age: new Date(event.starts_at).getUTCFullYear() - me.birth_year, job: me.job };
  return (
    <Entry slug={slug} given={given} when={`${s.dateLabel} ${s.time}`} devStep={devStep} lounge={lounge}
      me={p && { nickname: p.nickname, area: p.area, mbti: p.mbti, keywords: p.keywords, answers: p.answers, loveType: p.love_type, shape: p.shape as Shape, prop: p.prop }} />
  );
}
