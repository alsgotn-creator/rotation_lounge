'use client';
import { useState } from 'react';
import { Character } from '../../../components/Character';
import { containsContact, NOTE_MAX, PAPER_FONTS } from '../../../lib/domain/notes';
import type { Prop, Shape } from '../../../lib/domain/register';
import type { PlayView } from '../../../lib/server/play';

/** 라운드가 끝난 뒤 방금 대화한 상대에게 한마디 (꼭 써야 한다, 내 호 번호가 함께 전달된다). 다음 라운드가 시작돼도 쓸 때까지 이 화면이 먼저 나온다. */
export default function NoteWrite({ slug, pending, onDone }: { slug: string; pending: NonNullable<PlayView['pending']>; onDone: () => void }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [font, setFont] = useState<string>(PAPER_FONTS[0][0]);
  const { to, round } = pending;
  const label = `${to.gender === 'f' ? '여' : '남'}${to.number}호`;
  const contact = text.trim() && containsContact(text);

  const send = async (body: string) => {
    if (contact) return setErr('연락처로 보이는 내용이 있어요');
    setBusy(true); setErr('');
    const r = await fetch(`/api/e/${slug}/note`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ round, toId: to.id, body, font }) });
    const j = await r.json().catch(() => ({ ok: false, message: '다시 시도해주세요.' }));
    setBusy(false);
    if (!j.ok && r.status !== 409) return setErr(j.message);
    setText(''); onDone();
  };

  return (
    <main className="nw">
      <div className="nw-top"><Character shape={to.shape as Shape} color={to.color} prop={to.prop as Prop} size={96} /></div>
      <h2 className="q" style={{ textAlign: 'center' }}>{label}에게 한마디</h2>
      <p className="ds" style={{ textAlign: 'center' }}>{round}번째 라운지에서 만난 분께 남기는 쪽지예요.</p>
      <div className="nw-fonts" role="radiogroup" aria-label="글씨체">
        {PAPER_FONTS.map(([f, name]) => <button key={f} type="button" role="radio" aria-checked={font === f} className={font === f ? 'on' : ''} style={{ fontFamily: `"${f}"` }} onClick={() => setFont(f)}>{name}</button>)}
      </div>
      <div className="paper">
        <textarea style={{ fontFamily: `"${font}","Nanum Pen Script",cursive` }} autoFocus maxLength={NOTE_MAX} placeholder="오늘 이야기가 즐거웠어요" aria-label={`${label}에게 쓰는 쪽지`} value={text}
          onChange={(e) => { setText(e.target.value); setErr(''); }} />
        <span className="cnt">{text.length}/{NOTE_MAX}</span>
      </div>
      <p className="hint" style={{ justifyContent: 'center' }}>연락처 입력 시 매칭이 되지 않아요</p>
      {(err || contact) && <p role="alert" className="msg e" style={{ textAlign: 'center', color: 'var(--err)', fontSize: 14, margin: '10px 0 0' }}>{err || '연락처로 보이는 내용이 있어요'}</p>}
      <div className="ft">
        <button className="btn" disabled={busy || !text.trim() || !!contact} onClick={() => send(text)}>{busy ? '보내는 중…' : '남기기'}</button>
      </div>
    </main>
  );
}
