import { cloud } from '../lib/domain/ideal';

// 같은 글자는 항상 같은 값 — 서버/클라이언트 화면이 어긋나지 않게 무작위처럼만 보이게 한다.
const h = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** 카드 한 장 안에 키워드를 칩으로. 많이 적힌 건 크고 진하게, 위치·기울기는 글자마다 고정된 무작위. 숫자·작성자는 보여주지 않는다. */
export function IdealCloud({ title, lists, tone }: { title: string; lists: string[][]; tone: 'f' | 'm' }) {
  const words = cloud(lists);
  if (!words.length) return null;
  const mx = words[0].count;
  const shuffled = [...words].sort((a, b) => h(a.word) - h(b.word));
  return (
    <section className={`idc idc-${tone}`}>
      <h2 className="idc-t">{title}</h2>
      <div className="idc-card">
        {shuffled.map((w) => {
          const r = h(w.word);
          const hot = mx > 1 && w.count === mx;
          return (
            <span key={w.word} className={hot ? 'hot' : undefined} style={{ fontSize: 13 + 2 * Math.min(w.count, 4), transform: `translate(${(r % 11) - 5}px,${((r >> 4) % 15) - 7}px) rotate(${((r >> 8) % 7) - 3}deg)` }}>{w.word}</span>
          );
        })}
      </div>
    </section>
  );
}
