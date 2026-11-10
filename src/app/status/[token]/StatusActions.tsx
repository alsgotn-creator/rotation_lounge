'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '../../../components/Icon';
import { api } from '../../../lib/api';

export default function StatusActions({ token, copy, cancelOnly }: { token: string; copy?: string; cancelOnly?: boolean }) {
  const router = useRouter();
  const [toast, setToast] = useState('');
  const [ask, setAsk] = useState(false);
  const show = (t: string) => { setToast(t); setTimeout(() => setToast(''), 2200); };
  const doCopy = async () => { try { await navigator.clipboard.writeText(copy!); show('계좌번호를 복사했어요'); } catch { show(copy!); } };
  const cancel = async () => {
    const r = await api(`/api/status/${token}/cancel`, {});
    setAsk(false);
    if (r.ok) router.refresh(); else show('취소하지 못했어요. 다시 시도해주세요.');
  };
  return (
    <>
      {!cancelOnly && <button className="btn" onClick={doCopy}>계좌번호 복사하기</button>}
      {cancelOnly && <button className="cancel" onClick={() => setAsk(true)}>신청 취소하기</button>}
      {ask && <>
        <div className="dim" onClick={() => setAsk(false)} />
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="cx">
          <div className="grab" />
          <h3 id="cx">신청을 취소할까요?</h3>
          <p className="ds">취소하면 되돌릴 수 없어요. 다시 오시려면 새로 신청해주세요.</p>
          <div className="btn2" style={{ marginTop: 20 }}><button className="btn sub" onClick={() => setAsk(false)}>닫기</button><button className="btn" onClick={cancel}>취소하기</button></div>
        </div>
      </>}
      {toast && <div className="toast" role="status"><Icon name="check" />{toast}</div>}
    </>
  );
}
