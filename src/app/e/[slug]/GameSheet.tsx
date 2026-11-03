'use client';
import { useState } from 'react';
import { ANSWER_MAX, KINDS } from '../../../lib/domain/cards';
import type { PlayView } from '../../../lib/server/play';

const ho = (g: 'f' | 'm', n: number) => `${g === 'f' ? '여' : '남'}${n}호`;

/** 라운드 중 선택형 페어 게임. 같은 테이블 사람들이 같은 카드를 보고, 모두 답하면 서로의 답이 함께 열린다. 언제든 닫을 수 있다. */
export default function GameSheet({ slug, game, onClose, onChange }: { slug: string; game: PlayView['game']; onClose: () => void; onChange: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [picking, setPicking] = useState(false);

  const post = async (body: object) => {
    setBusy(true); setErr('');
    const r = await fetch(`/api/e/${slug}/game`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ ok: false, message: '다시 시도해주세요.' }));
    setBusy(false);
    if (!j.ok && r.status !== 409) return setErr(j.message);
    setText(''); setPicking(false); onChange();
  };

  const body = !game || picking ? (
    <>
      <h2 className="q">어떤 카드로 할까요?</h2>
      <p className="ds">고르면 이 테이블 모두에게 같은 카드가 보여요.</p>
      {KINDS.map((k) => (
        <button key={k.kind} className="opt" disabled={busy} onClick={() => post({ type: 'draw', kind: k.kind })}>
          <span><b>{k.label}</b><small style={{ display: 'block', color: 'var(--mute)', fontWeight: 600, marginTop: 2 }}>{k.sub}</small></span>
        </button>
      ))}
    </>
  ) : (
    <>
      <p className="gm-kind">{KINDS.find((k) => k.kind === game.kind)?.label}</p>
      <h2 className="gm-prompt">{game.prompt}</h2>
      {game.hint && <p className="gm-hint">{game.hint}</p>}

      {game.answers ? (
        <div className="gm-ans">
          {game.answers.map((a) => (
            <div key={`${a.gender}${a.number}`} className={a.me ? 'me' : ''}><small>{a.me ? '나' : ho(a.gender, a.number)}</small><b>{a.text}</b></div>
          ))}
        </div>
      ) : game.mine ? (
        <p className="gm-wait">내 답: <b>{game.mine}</b><br />상대를 기다리는 중… ({game.answered}/{game.total})</p>
      ) : game.options ? (
        <div className="gm-opts">
          {game.options.map((o) => <button key={o} className="opt" disabled={busy} onClick={() => post({ type: 'answer', answer: o })}>{o}</button>)}
        </div>
      ) : (
        <>
          <div className="paper" style={{ marginTop: 14 }}>
            <textarea maxLength={ANSWER_MAX} placeholder="내 생각을 적어요" aria-label="내 답" value={text} onChange={(e) => setText(e.target.value)} />
            <span className="cnt">{text.length}/{ANSWER_MAX}</span>
          </div>
          <button className="btn" style={{ marginTop: 12 }} disabled={busy || !text.trim()} onClick={() => post({ type: 'answer', answer: text })}>답하기</button>
        </>
      )}
      {err && <p role="alert" style={{ color: 'var(--err)', fontSize: 14, textAlign: 'center' }}>{err}</p>}
      <div className="btn2" style={{ marginTop: 16, gridTemplateColumns: '1fr 1fr' }}>
        <button className="btn sub" disabled={busy} onClick={() => setPicking(true)}>다른 카드</button>
        <button className="btn sub" onClick={onClose}>닫기</button>
      </div>
    </>
  );

  return (
    <div className="gm-scrim" onClick={onClose}>
      <section className="gm-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <i className="gm-grab" aria-hidden="true" />
        {body}
        {(!game || picking) && err && <p role="alert" style={{ color: 'var(--err)', fontSize: 14, textAlign: 'center' }}>{err}</p>}
        {(!game || picking) && <button className="lnk" style={{ margin: '14px auto 0', display: 'block' }} onClick={() => (picking ? setPicking(false) : onClose())}>{picking ? '돌아가기' : '닫기'}</button>}
      </section>
    </div>
  );
}
