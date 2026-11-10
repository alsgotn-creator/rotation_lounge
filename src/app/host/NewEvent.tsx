'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';

export default function NewEvent() {
  const router = useRouter();
  const [f, setF] = useState({ date: '', time: '19:30', venue: '성수', birthFrom: '1994', birthTo: '1999', tables: '7', perTable: '1' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setErr('');
    const j = await api<{ slug: string }>('/api/host/events', f);
    setBusy(false);
    if (!j.ok) return setErr(j.message ?? '다시 시도해주세요.');
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
      <div className="btn2" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <label className="fld"><span>몇 년생부터</span><input inputMode="numeric" value={f.birthFrom} onChange={set('birthFrom')} maxLength={4} /></label>
        <label className="fld"><span>몇 년생까지</span><input inputMode="numeric" value={f.birthTo} onChange={set('birthTo')} maxLength={4} /></label>
      </div>
      <div className="btn2" style={{ gridTemplateColumns: '1fr 1.4fr', alignItems: 'end' }}>
        <label className="fld"><span>테이블 수 (2~12)</span><input inputMode="numeric" value={f.tables} onChange={set('tables')} maxLength={2} /></label>
        <div className="fld"><span>한 테이블 인원</span>
          <div className="chips" style={{ marginTop: 8 }}>
            {['1', '2', '3'].map((n) => <button type="button" key={n} aria-pressed={f.perTable === n} onClick={() => setF({ ...f, perTable: n })}
              style={f.perTable === n ? { background: 'var(--accbg)', color: 'var(--acc)' } : undefined}>{n}:{n}</button>)}
          </div></div>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>성별당 최대 {Math.max(0, Number(f.tables) || 0) * Number(f.perTable)}명 (테이블 {f.tables || 0}개 x {f.perTable}명)</p>
      {err && <p className="msg e" role="alert" style={{ color: 'var(--err)', fontSize: 13 }}>{err}</p>}
      <div className="row"><button className="btn" disabled={busy || !f.date}>{busy ? '만드는 중…' : '일정 만들기'}</button></div>
    </form>
  );
}
