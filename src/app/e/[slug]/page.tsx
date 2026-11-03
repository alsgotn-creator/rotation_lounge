import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Icon } from '../../../components/Icon';
import { getEvent } from '../../../lib/server/signup';
import { hasDb } from '../../../lib/server/supabase';
import { findInvited, inviteCookie } from '../../../lib/server/invite';
import { toSession } from '../../../lib/signup/rules';
import { BUSINESS } from '../../../lib/signup/data';

export const metadata: Metadata = { title: '라운지 · 플러팅 라운지', robots: { index: false } };
export const dynamic = 'force-dynamic';

// 참가자 전용 라운지 입구. 지금은 입장 확인까지만 있고, 사전 등록·라운지 화면은 계획서 Task 8 이후에 이어 붙인다.
export default async function Lounge({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ bad?: string }> }) {
  if (!hasDb()) notFound();
  const { slug } = await params;
  const { bad } = await searchParams;
  const event = await getEvent({ slug });
  if (!event) notFound();
  const me = await findInvited(event.id, (await cookies()).get(inviteCookie(event.id))?.value);
  const s = toSession(event, []);

  if (!me) return (
    <main className="fin">
      <div className="big" style={{ background: 'var(--surf2)', boxShadow: 'none' }}><span style={{ color: 'var(--acc)' }}><Icon name="lock" /></span></div>
      <h2 className="q">입장 링크가 필요해요</h2>
      <p className="ds">{bad ? '링크가 맞지 않거나 새 링크로 바뀌었어요.' : '이 라운지는 참가가 확정된 분만 들어올 수 있어요.'}<br />호스트에게 받은 <b>나만의 입장 링크</b>로 들어와주세요.</p>
      <p className="preview" style={{ marginTop: 24 }}>문의 {BUSINESS.email}</p>
    </main>
  );

  return (
    <main className="fin">
      <div className="big"><Icon name="check" /></div>
      <h2 className="q">{me.name}님,<br />입장이 확인됐어요</h2>
      <p className="ds">{s.dateLabel} {s.time} · {event.venue}</p>
      <div className="card" style={{ paddingBottom: 18 }}>
        <p className="ds" style={{ margin: 0 }}>사전 등록(닉네임·캐릭터·연애 질문 15개)은 곧 이 화면에서 열려요. 열리면 같은 링크로 다시 들어와주세요.</p>
      </div>
    </main>
  );
}
