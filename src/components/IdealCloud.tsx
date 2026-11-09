import { cloud } from '../lib/domain/ideal';

/** 가장 많이 적힌 키워드를 가운데 크게, 나머지는 위아래로 작게. 숫자·작성자는 보여주지 않는다. */
export function IdealCloud({ title, lists }: { title: string; lists: string[][] }) {
  const [top, ...rest] = cloud(lists);
  if (!top) return null;
  const half = Math.ceil(rest.length / 2);
  const words = (ws: typeof rest, from: number) => (
    <div className="idc-row">{ws.map((w, i) => <span key={w.word} style={{ fontSize: 12 + 3 * w.count, transform: `rotate(${((from + i) % 5) - 2}deg)` }}>{w.word}</span>)}</div>
  );
  return (
    <section className="idc">
      <h2 className="idc-t">{title}</h2>
      {words(rest.slice(0, half), 0)}
      <b className="idc-top">{top.word}</b>
      {words(rest.slice(half), half)}
    </section>
  );
}
