import { layoutNotes } from '../lib/domain/notes';

const HEARTS = [[14, 12], [78, 9], [46, 30], [10, 52], [86, 46], [30, 78], [66, 70], [90, 86]];

/** 크림색 편지지 한 장에 받은 쪽지를 흩어 놓는다. 쓴 사람은 어디에도 없다. */
export function RollingPaper({ notes }: { notes: { id: string; body: string }[] }) {
  const placed = layoutNotes(notes.map((n) => n.id));
  return (
    <div className="rp">
      <div className="rp-sheet">
        {HEARTS.map(([x, y], i) => <span key={i} className="rp-heart" style={{ left: `${x}%`, top: `${y}%`, opacity: 0.35 + (i % 3) * 0.12 }} aria-hidden="true">♡</span>)}
        {notes.length === 0
          ? <p className="rp-empty">아직 도착한 마음이 없어요</p>
          : notes.map((n, i) => {
              const p = placed[i];
              return <p key={n.id} className="rp-note" style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, transform: `rotate(${p.rotDeg}deg)`, fontSize: p.sizePx, color: p.ink }}>{n.body}</p>;
            })}
      </div>
      <p className="rp-foot">{notes.length}장 · 누가 썼는지는 비밀이에요</p>
    </div>
  );
}
