import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Icon } from '../../../components/Icon';
import { findByStatusToken } from '../../../lib/server/signup';
import { hasDb } from '../../../lib/server/supabase';
import { toSession } from '../../../lib/signup/rules';
import { ACCOUNT, BUSINESS, won } from '../../../lib/signup/data';
import StatusActions from './StatusActions';

export const metadata: Metadata = { title: '신청 내역 · 플러팅 라운지', robots: { index: false } };
export const dynamic = 'force-dynamic';

const kDate = (d: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date(d + 'T12:00:00+09:00'));

export default async function Status({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!hasDb()) notFound();
  const found = await findByStatusToken(token);
  if (!found) notFound();
  const { app, event } = found;
  const s = toSession(event, []);
  const st = app.status;

  const head = {
    new: { badge: '확인 중', title: <>호스트가 신청을<br />확인하고 있어요</>, desc: <>보통 하루 안에 끝나요. 확인되면 입금 안내를 보내드려요.</> },
    held: { badge: '대기', title: <>잠시 대기 중이에요</>, desc: <>성비를 맞추는 중이에요. 자리가 나면 바로 알려드려요.</> },
    awaiting_payment: { badge: '입금 대기', title: <>{won(event.price)}을<br />입금해주세요</>, desc: <><b>{app.payment_due ? kDate(app.payment_due) : '안내받은 날'}까지</b> 입금하면 자리가 확정돼요.</> },
    confirmed: { badge: '확정', title: app.number != null ? <>당신은 {app.gender === 'f' ? '여자' : '남자'} {app.number}호예요</> : <>자리가 확정됐어요.<br />라운지에서 만나요</>, desc: <>첫 대화는 <b>{app.number}번 테이블</b>에서 시작해요. 호스트가 보내드린 <b>나만의 입장 링크</b>로 사전 등록을 해주세요.</> },
    cancelled: { badge: '취소됨', title: <>취소된 신청이에요</>, desc: <>다음 일정에 다시 신청해주세요.</> },
  }[st];
  const at = st === 'held' ? 0 : ['new', 'awaiting_payment', 'confirmed'].indexOf(st);
  const cls = (i: number) => (i < at ? 'done' : i === at ? 'now' : '');

  return (
    <main>
      <div className="nb"><Link className="bk" aria-label="처음으로" href="/"><Icon name="back" /></Link><div className="tt">신청 내역</div></div>
      <div className="bd" style={{ paddingTop: 14 }}>
        <span className="badge">{head.badge}</span>
        <h2 className="q" style={{ marginTop: 12 }}>{head.title}</h2>
        <p className="ds">{head.desc}</p>

        {st === 'awaiting_payment' && (
          <div className="acct">
            {ACCOUNT.number ? <>
              <div className="kv"><span>받는 계좌</span><b>{ACCOUNT.bank} {ACCOUNT.number}</b></div>
              <div className="kv"><span>받는 분</span><b>{ACCOUNT.holder}</b></div>
            </> : <div className="kv"><span>입금 계좌</span><b>호스트가 따로 알려드려요</b></div>}
            <div className="kv"><span>보내는 분 이름</span><b>{app.name}</b></div>
            {ACCOUNT.number && <StatusActions token={token} copy={`${ACCOUNT.bank} ${ACCOUNT.number}`} />}
          </div>
        )}

        <div className="acct" style={{ marginTop: 16 }}>
          <div className="kv"><span>일정</span><b>{s.dateLabel} {s.time}</b></div>
          <div className="kv"><span>장소</span><b>{event.venue}</b></div>
          <div className="kv"><span>신청자</span><b>{app.name} · {app.gender === 'f' ? '여성' : '남성'}</b></div>
        </div>

        {st !== 'cancelled' && <div className="tl" style={{ marginTop: 22 }}>
          <div className={cls(0)}><i /><span><b>{st === 'held' ? '대기 중' : '호스트 확인'}</b><small>신청을 확인해요</small></span></div>
          <div className={cls(1)}><i /><span><b>입금</b><small>입금이 확인되면 입장 링크를 드려요</small></span></div>
          <div className={cls(2)}><i /><span><b>확정 · 사전 등록</b><small>나만의 링크로 라운지에 들어와요</small></span></div>
        </div>}

        {(st === 'new' || st === 'held' || st === 'awaiting_payment') && <StatusActions token={token} cancelOnly />}
        {st === 'confirmed' && <p className="preview">취소·환불은 {BUSINESS.email}로 문의해주세요 (3일 전까지 전액 · 2일 전~전날 50% · 당일 없음)</p>}
      </div>
    </main>
  );
}
