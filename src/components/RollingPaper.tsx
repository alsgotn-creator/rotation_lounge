'use client';
import { useEffect, useState } from 'react';
import { layoutNotes } from '../lib/domain/notes';

const HEARTS = [[14, 12], [78, 9], [46, 30], [10, 52], [86, 46], [30, 78], [66, 70], [90, 86]];
export const PAPER_FONTS = [
  ['Nanum Pen Script', '나눔펜'], ['Gaegu', '개구'], ['Gamja Flower', '감자꽃'], ['Hi Melody', '하이멜로디'], ['Poor Story', '푸어스토리'], ['Pretendard Variable', '기본'],
] as const;
type Note = { id: string; body: string; from?: { gender: 'f' | 'm'; number: number | null } };
const KEY = 'fl_paper_font';

/** 크림색 편지지 한 장에 받은 쪽지를 흩어 놓는다. 쓴 사람의 호 번호가 쪽지마다 붙는다. 글꼴은 읽는 사람이 고른다(이 폰에만 기억). */
export function RollingPaper({ notes }: { notes: Note[] }) {
  const placed = layoutNotes(notes.map((n) => n.id));
  const [font, setFont] = useState<string>(PAPER_FONTS[0][0]);
  useEffect(() => { try { const f = localStorage.getItem(KEY); if (f && PAPER_FONTS.some(([x]) => x === f)) setFont(f); } catch {} }, []);
  const pick = (f: string) => { setFont(f); try { localStorage.setItem(KEY, f); } catch {} };
  const writers = (g: 'f' | 'm') => [...new Set(notes.filter((n) => n.from?.gender === g && n.from.number != null).map((n) => n.from!.number!))].sort((a, b) => a - b);
  const who = (['f', 'm'] as const).map((g) => ({ g, ns: writers(g) })).filter((x) => x.ns.length);
  const ff = `"${font}","Nanum Pen Script",cursive`;

  return (
    <div className="rp">
      {who.length > 0 && <p className="rp-who">{who.map((x) => `${x.g === 'f' ? '여자' : '남자'} ${x.ns.map((n) => `${n}호`).join(' · ')}`).join('  /  ')}가 적어줬어요</p>}
      <div className="rp-fonts" role="radiogroup" aria-label="글꼴">
        {PAPER_FONTS.map(([f, label]) => <button key={f} role="radio" aria-checked={font === f} className={font === f ? 'on' : ''} style={{ fontFamily: `"${f}"` }} onClick={() => pick(f)}>{label}</button>)}
      </div>
      <div className="rp-sheet">
        {HEARTS.map(([x, y], i) => <span key={i} className="rp-heart" style={{ left: `${x}%`, top: `${y}%`, opacity: 0.35 + (i % 3) * 0.12 }} aria-hidden="true">♡</span>)}
        {notes.length === 0
          ? <p className="rp-empty" style={{ fontFamily: ff }}>아직 도착한 마음이 없어요</p>
          : notes.map((n, i) => {
              const p = placed[i];
              return <p key={n.id} className="rp-note" style={{ left: `${p.xPct}%`, top: `${p.yPct}%`, transform: `rotate(${p.rotDeg}deg)`, fontSize: p.sizePx, color: p.ink, fontFamily: ff }}>{n.body}{n.from && <small style={{ display: 'block', fontSize: 13, opacity: .75 }}>- {n.from.gender === 'f' ? '여자' : '남자'} {n.from.number}호</small>}</p>;
            })}
      </div>
      <p className="rp-foot">{notes.length}장 · 최종 선택 단계에서만 볼 수 있어요</p>
    </div>
  );
}
