import { cloud } from '../lib/domain/ideal';

// 같은 글자는 항상 같은 값 — 서버/클라이언트 화면이 어긋나지 않게 무작위처럼만 보이게 한다.
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** 여자분·남자분이 적은 이상형을 박스 하나에 칩으로 섞어 띄운다. 색으로 남녀만 구분하고, 많이 적힌 건 크고 진하게. 숫자·작성자는 보여주지 않는다. */
export function IdealCloud({ lists }: { lists: Record<'f' | 'm', string[][]> }) {
  const words = (['f', 'm'] as const).flatMap((g) => {
    const ws = cloud(lists[g]);
    const mx = ws[0]?.count ?? 0;
    return ws.map((w) => ({ ...w, g, hot: mx > 1 && w.count === mx }));
  });
  if (!words.length) return null;
  const shuffled = words.sort((a, b) => h(a.g + a.word) - h(b.g + b.word));
  return (
    <section className="idc">
      <h2 className="idc-t">우리가 적은 이상형</h2>
      <p className="idc-lg"><i className="f" />여자분들이 적은 <i className="m" />남자분들이 적은</p>
      <div className="idc-card">
        {shuffled.map((w) => {
          const r = h(w.g + w.word);
          return (
            <span key={w.g + w.word} className={`${w.g}${w.hot ? ' hot' : ''}`} style={{ fontSize: 11 + 1.5 * Math.min(w.count, 4), transform: `translate(${(r % 7) - 3}px,${((r >> 4) % 9) - 4}px) rotate(${((r >> 8) % 7) - 3}deg)` }}>{w.word}</span>
          );
        })}
      </div>
    </section>
  );
}
