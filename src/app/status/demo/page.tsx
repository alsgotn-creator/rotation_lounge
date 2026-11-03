'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import { ACCOUNT, PRICE, won } from '../../../lib/signup/data';

export default function StatusDemo() {
  const router = useRouter();
  const [toast, setToast] = useState('');
  const show = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${ACCOUNT.bank} ${ACCOUNT.number}`); show('계좌번호를 복사했어요'); }
    catch { show(`${ACCOUNT.bank} ${ACCOUNT.number}`); }
  };
  return (
    <main>
      <div className="nb"><button className="bk" aria-label="뒤로" onClick={() => router.push('/')}><Icon name="back" /></button><div className="tt">신청 내역</div></div>
      <div className="bd" style={{ paddingTop: 14 }}>
        <span className="badge">입금 대기</span>
        <h2 className="q" style={{ marginTop: 12 }}>{won(PRICE)}을<br />입금해주세요</h2>
        <p className="ds"><b>11월 10일(월)까지</b> 입금하면 자리가 확정돼요.</p>
        <div className="acct">
          <div className="kv"><span>받는 계좌</span><b>{ACCOUNT.bank} {ACCOUNT.number}</b></div>
          <div className="kv"><span>받는 분</span><b>{ACCOUNT.holder}</b></div>
          <div className="kv"><span>보내는 분 이름</span><b>김민지</b></div>
          <button className="btn" onClick={copy}>계좌번호 복사하기</button>
        </div>
        <div className="tl" style={{ marginTop: 22 }}>
          <div className="done"><i /><span><b>신청 완료</b><small>11월 3일</small></span></div>
          <div className="done"><i /><span><b>호스트 확인</b><small>11월 4일</small></span></div>
          <div className="now"><i /><span><b>입금 대기</b><small>입금이 확인되면 사전 등록 링크를 보내드려요</small></span></div>
        </div>
        <button className="cancel" onClick={() => show('미리보기에서는 취소할 수 없어요')}>신청 취소하기</button>
        <p className="preview">미리보기용 예시 내역이에요</p>
      </div>
      {toast && <div className="toast" role="status"><Icon name="check" />{toast}</div>}
    </main>
  );
}
