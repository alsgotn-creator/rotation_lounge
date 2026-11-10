'use client';
import { useState } from 'react';
import { api } from '../../../lib/api';
import { KINDS } from '../../../lib/domain/cards';
import { ho } from '../../../lib/domain/lounge';
import type { PlayView } from '../../../lib/server/play';

/** 라운드 화면에 늘 펼쳐져 있는 선택형 페어 게임. 종류를 누르면 카드가 나오고, 같은 테이블 모두가 고르면 답이 함께 열린다. */
export default function GameSheet({ slug, game, onChange }: { slug: string; game: PlayView['game']; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const post = async (body: object) => {
    setBusy(true); setErr('');
    const j = await api(`/api/e/${slug}/game`, body);
    setBusy(false);
    if (!j.ok && j.http !== 409) return setErr(j.message ?? '다시 시도해주세요.');
    onChange();
  };

  return (
    <section className="gm-inline" aria-label="같이 해보기">
      <div className="gm-kinds">
        {KINDS.map((k) => (
          <button key={k.kind} className={game?.kind === k.kind ? 'on' : ''} disabled={busy} onClick={() => post({ type: 'draw', kind: k.kind })}>{k.label}</button>
        ))}
      </div>
      {!game ? <p className="gm-hint">하나를 누르면 이 테이블 모두에게 같은 카드가 떠요</p> : <>
        <h2 className="gm-prompt">{game.prompt}</h2>
        {game.answers ? (
          <div className="gm-ans">
            {game.answers.map((a) => (
              <div key={`${a.gender}${a.number}`} className={a.me ? 'me' : ''}><small>{a.me ? '나' : ho(a.gender, a.number)}</small><b>{a.text}</b></div>
            ))}
          </div>
        ) : game.mine ? (
          <p className="gm-wait">내 답: <b>{game.mine}</b><br />상대를 기다리는 중… ({game.answered}/{game.total})</p>
        ) : (
          <div className={`gm-opts${game.options.length > 2 ? ' many' : ''}`}>
            {game.options.map((o) => <button key={o} className="opt" disabled={busy} onClick={() => post({ type: 'answer', answer: o })}>{o}</button>)}
          </div>
        )}
        <p className="gm-hint">위 종류를 다시 누르면 다른 카드가 나와요</p>
      </>}
      {err && <p role="alert" style={{ color: 'var(--err)', fontSize: 14, textAlign: 'center' }}>{err}</p>}
    </section>
  );
}
