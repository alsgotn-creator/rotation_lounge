import { layoutNotes } from '../lib/domain/notes';

const HEARTS = [[14, 12], [78, 9], [46, 30], [10, 52], [86, 46], [30, 78], [66, 70], [90, 86]];
type Note = { id: string; body: string; font: string; from?: { gender: 'f' | 'm'; number: number | null } };

/** 크림색 편지지 한 장에 받은 쪽지를 겹치지 않게 흩어 놓는다. 글꼴은 쓴 사람이 고른 것, 쪽지마다 쓴 사람의 호가 붙는다. */
export function RollingPaper({ notes }: { notes: Note[] }) {
  const placed = layoutNotes(notes);
  const writers = (g: 'f' | 'm') => [...new Set(notes.filter((n) => n.from?.gender === g && n.from.number != null).map((n) => n.from!.number!))].sort((a, b) => a - b);
  const who = (['f', 'm'] as const).map((g) => ({ g, ns: writers(g) })).filter((x) => x.ns.length);

  return (
    <div className="rp">
      {who.length > 0 && <p className="rp-who">{who.map((x) => `${x.g === 'f' ? '여자' : '남자'} ${x.ns.map((n) => `${n}호`).join(' · ')}`).join('  /  ')}가 적어줬어요</p>}
      <div className="rp-sheet">
        {HEARTS.map(([x, y], i) => <span key={i} className="rp-heart" style={{ left: `${x}%`, top: `${y}%`, opacity: 0.35 + (i % 3) * 0.12 }} aria-hidden="true">♡</span>)}
        {notes.length === 0
          ? <p className="rp-empty">아직 도착한 마음이 없어요</p>
          : notes.map((n, i) => {
              const p = placed[i];
              return (
                <p key={n.id} className={`rp-note${p.half ? ' half' : ''}`} style={{ transform: `rotate(${p.rotDeg}deg)`, marginLeft: p.half ? undefined : `${p.shiftPct}%`, fontSize: p.sizePx, color: p.ink, fontFamily: `"${n.font}","Nanum Pen Script",cursive` }}>
                  {n.body}{n.from && <small>- {n.from.gender === 'f' ? '여자' : '남자'} {n.from.number}호</small>}
                </p>
              );
            })}
      </div>
      <p className="rp-foot">{notes.length}장 · 최종 선택 단계에서만 볼 수 있어요</p>
    </div>
  );
}
