'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { after010 } from '../lib/signup/validate';

/** 승인된 분은 신청한 휴대폰 번호만 넣으면 라운지로 들어간다. */
export default function EnterCard() {
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  // 이 카드가 화면에 보이는 동안엔 아래 고정 '신청하기' 버튼을 숨겨서 두 버튼이 겹치지 않게
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => document.body.classList.toggle('enter-on', e.isIntersecting));
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); document.body.classList.remove('enter-on'); };
  }, []);
  async function go(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg('');
    const j = await api<{ slug: string }>('/api/enter', { phone: `010${phone}` });
    if (j.ok) { location.href = `/e/${j.slug}`; return; }
    setMsg(j.message ?? '다시 시도해주세요.'); setBusy(false);
  }
  return (
    <form ref={ref} className="price enter" onSubmit={go}>
      <span className="stepno"><b>2</b>입장하기</span>
      <b>승인 받으셨나요?</b>
      <label className={`fld${msg ? ' err' : ''}`} style={{ marginTop: 14 }}>
        <span>신청할 때 쓴 휴대폰 번호</span>
        <div className="tel010"><b>010</b><input type="tel" inputMode="numeric" autoComplete="tel-local-suffix" placeholder="1234 5678" maxLength={14} aria-label="010 뒤 8자리" value={phone.length > 4 ? `${phone.slice(0, 4)} ${phone.slice(4)}` : phone} onChange={(e) => setPhone(after010(e.target.value))} required /></div>
        {msg && <p className="msg e">{msg}</p>}
      </label>
      <button className="btn" style={{ marginTop: 18 }} disabled={busy || phone.length !== 8}>{busy ? '확인 중…' : '라운지 입장하기'}</button>
    </form>
  );
}
