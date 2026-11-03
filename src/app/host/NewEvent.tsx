'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewEvent() {
  const router = useRouter();
  const [f, setF] = useState({ date: '', time: '19:30', venue: '성수', birthFrom: '1994', birthTo: '1999', capacity: '7' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const r = await fetch('/api/host/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const j = await r.json().catch(() => ({ ok: false, message: '다시 시도해주세요.' }));
    setBusy(false);
    if (!j.ok) return setErr(j.message);
    router.push(`/host/${j.slug}`);
  };
  return (
    <form className="addf" style={{ marginTop: 28 }} onSubmit={save}>
      <p className="eb" style={{ marginTop: 16 }}>새 일정 만들기</p>
      <div className="btn2" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
        <label className="fld"><span>날짜</span><input type="date" value={f.date} onChange={set('date')} required /></label>
        <label className="fld"><span>시간</span><input type="time" value={f.time} onChange={set('time')} required /></label>
      </div>
      <label className="fld"><span>장소</span><input value={f.venue} onChange={set('venue')} maxLength={40} /></label>
      <div className="btn2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <label className="fld"><span>몇 년생부터</span><input inputMode="numeric" value={f.birthFrom} onChange={set('birthFrom')} maxLength={4} /></label>
        <label className="fld"><span>몇 년생까지</span><input inputMode="numeric" value={f.birthTo} onChange={set('birthTo')} maxLength={4} /></label>
        <label className="fld"><span>성별당 인원</span><input inputMode="numeric" value={f.capacity} onChange={set('capacity')} maxLength={2} /></label>
      </div>
      {err && <p className="msg e" role="alert" style={{ color: 'var(--err)', fontSize: 13 }}>{err}</p>}
      <div className="row"><button className="btn" disabled={busy || !f.date}>{busy ? '만드는 중…' : '일정 만들기'}</button></div>
    </form>
  );
}
