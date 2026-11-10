'use client';
import { useState } from 'react';
import { formatPhone } from '../lib/signup/validate';

/** 승인된 분은 신청한 휴대폰 번호만 넣으면 라운지로 들어간다. */
export default function EnterCard() {
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true); setMsg('');
    const r = await fetch('/api/enter', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone }) }).catch(() => null);
    const j = await r?.json().catch(() => null);
    if (j?.ok) { location.href = `/e/${j.slug}`; return; }
    setMsg(j?.message ?? '연결이 불안정해요. 다시 시도해주세요.'); setBusy(false);
  }
  return (
    <form className="price enter" onSubmit={go}>
      <b>승인 받으셨나요?</b>
      <label className={`fld${msg ? ' err' : ''}`} style={{ marginTop: 14 }}>
        <span>신청할 때 쓴 휴대폰 번호</span>
        <input type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} required />
        {msg && <p className="msg e">{msg}</p>}
      </label>
      <button className="btn" style={{ marginTop: 18 }} disabled={busy || phone.length < 12}>{busy ? '확인 중…' : '라운지 입장하기'}</button>
    </form>
  );
}
