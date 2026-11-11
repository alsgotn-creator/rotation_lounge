import { cloud } from '../lib/domain/ideal';

// 같은 글자는 항상 같은 값 — 서버/클라이언트 화면이 어긋나지 않게 무작위처럼만 보이게 한다.
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

const LABEL = { f: '여자분들이 적은', m: '남자분들이 적은' } as const;

/** 여자분·남자분이 적은 이상형을 한 박스 안에서 성별로 나눠 칩으로 띄운다. 많이 적힌 건 크고 진하게, 나머지도 크기를 조금씩 흔든다. 숫자·작성자는 보여주지 않는다. */
export function IdealCloud({ lists }: { lists: Record<'f' | 'm', string[][]> }) {
  const groups = (['f', 'm'] as const).map((g) => {
    const ws = cloud(lists[g]);
    const mx = ws[0]?.count ?? 0;
    return { g, words: ws.map((w) => ({ ...w, hot: mx > 1 && w.count === mx })).sort((a, b) => h(a.word) - h(b.word)) };
  }).filter((x) => x.words.length);
  if (!groups.length) return null;
  return (
    <section className="idc">
      <h2 className="idc-t">우리가 적은 이상형</h2>
      <div className="idc-card">
        {groups.map(({ g, words }) => (
          <div key={g} className={`idc-g ${g}`}>
            <small>{LABEL[g]}</small>
            {words.map((w) => {
              const r = h(g + w.word);
              return (
                <span key={w.word} className={`${g}${w.hot ? ' hot' : ''}`} style={{ fontSize: 11 + 1.5 * Math.min(w.count, 4) + ((r >> 12) % 4) * 0.75, /* 한 번씩만 적힌 것도 크기가 조금씩 다르게 */ transform: `translate(${(r % 7) - 3}px,${((r >> 4) % 9) - 4}px) rotate(${((r >> 8) % 7) - 3}deg)` }}>{w.word}</span>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
